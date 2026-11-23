import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, combineLatest, debounceTime, of, startWith, switchMap } from 'rxjs';
import { LoginReportFilter, StudioApi } from '../../core/api/studio-api';
import { LoginAudit } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { fromUtc, toIsoDate } from '../../shared/date-utils';

/**
 * Login report: who signed in, signed out, or failed to sign in, across every studio. SuperAdmin only (the API enforces it too).
 * A page of its own, not a Settings tab. Defaults to the last 7 days; the CSV download uses the same filters.
 */
@Component({
  selector: 'app-login-report',
  imports: [ReactiveFormsModule, DatePipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    <header class="page-head slate">
      <span class="ico"><mat-icon>history</mat-icon></span>
      <h1>Login report <span class="sub">sign-ins across all studios</span></h1>
    </header>
    <section class="panel slate">
      <p class="intro">Sign-ins, sign-outs and failed attempts. A session that simply times out is not recorded as a sign-out. Times are shown in your local time (the download is in UTC).</p>
      <div class="filters">
        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>From</mat-label><input matInput type="date" [formControl]="from" /></mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>To</mat-label><input matInput type="date" [formControl]="to" /></mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Studio</mat-label>
          <mat-select [formControl]="studioId">
            <mat-option value="">All studios</mat-option>
            @for (s of studios(); track s.studioId) { <mat-option [value]="'' + s.studioId">{{ s.studioName }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Username</mat-label><input matInput [formControl]="username" /></mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Event</mat-label>
          <mat-select [formControl]="eventType">
            <mat-option value="">All</mat-option>
            <mat-option value="Login">Sign in</mat-option>
            <mat-option value="Logout">Sign out</mat-option>
            <mat-option value="LoginFailed">Failed attempt</mat-option>
          </mat-select>
        </mat-form-field>
        <button mat-flat-button type="button" class="download" [disabled]="downloading()" (click)="download()">
          <mat-icon>download</mat-icon>{{ downloading() ? 'Preparing…' : 'Export CSV' }}
        </button>
      </div>

      <table class="grid">
        <thead><tr><th>When</th><th>Studio</th><th>User</th><th>Event</th><th>IP address</th><th>Device</th></tr></thead>
        <tbody>
          @for (a of items(); track a.auditId) {
            <tr>
              <td>{{ fromUtc(a.occurredAt) | date: 'd MMM yyyy, h:mm:ss a' }}</td>
              <td>{{ a.studioName || '—' }}</td>
              <td><strong>{{ a.username }}</strong></td>
              <td><span class="evt" [class]="a.eventType">{{ label(a) }}</span></td>
              <td>{{ a.ipAddress || '—' }}</td>
              <td class="ua" [title]="a.userAgent || ''">{{ a.userAgent || '—' }}</td>
            </tr>
          } @empty { <tr><td colspan="6">No activity in this period.</td></tr> }
        </tbody>
      </table>
      @if (items().length >= 200) { <p class="intro">Showing the latest 200 events. Narrow the dates, studio or user to see older ones, or export the full list.</p> }
    </section>
  `,
  styles: `
    :host { display: block; max-width: 1100px; margin: 0 auto; }
    .intro { color: var(--mat-sys-on-surface-variant); margin: 0 0 12px; }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; mat-form-field { flex: 1 1 140px; } }
    .download { height: 56px; }
    .grid { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .ua { max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--mat-sys-on-surface-variant); font-size: 12px; }
    .evt { padding: 2px 10px; border-radius: 999px; font-size: 12px; background: #e3f2fd; color: #0d47a1; }
    .evt.Logout { background: #eceff1; color: #37474f; }
    .evt.LoginFailed { background: #ffebee; color: #b71c1c; }
    @media (max-width: 719px) { thead { display: none; } tr, td { display: block; } td { border: 0; padding: 2px 0; } tr { border-bottom: 1px solid var(--mat-sys-outline-variant); padding: 8px 0; } }
  `,
})
export class LoginReport {
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  protected readonly fromUtc = fromUtc;
  protected readonly downloading = signal(false);

  private readonly now = new Date();
  protected readonly from = new FormControl(toIsoDate(new Date(this.now.getFullYear(), this.now.getMonth(), this.now.getDate() - 6)), { nonNullable: true });
  protected readonly to = new FormControl(toIsoDate(this.now), { nonNullable: true });
  protected readonly studioId = new FormControl('', { nonNullable: true });
  protected readonly username = new FormControl('', { nonNullable: true });
  protected readonly eventType = new FormControl('', { nonNullable: true });

  protected readonly studios = toSignal(this.api.studios().pipe(catchError(() => of([]))), { initialValue: [] });

  protected readonly items = toSignal(
    combineLatest([this.from.valueChanges.pipe(startWith(this.from.value)), this.to.valueChanges.pipe(startWith(this.to.value)),
      this.studioId.valueChanges.pipe(startWith('')), this.username.valueChanges.pipe(startWith('')), this.eventType.valueChanges.pipe(startWith(''))]).pipe(
      debounceTime(250),
      switchMap(([from, to, studioId, username, eventType]) => this.api.loginAudits({ from, to, studioId, username, eventType })),
    ),
    { initialValue: [] as LoginAudit[] },
  );

  protected label(a: LoginAudit): string {
    return a.eventType === 'Login' ? 'Signed in' : a.eventType === 'Logout' ? 'Signed out' : 'Failed attempt';
  }

  protected download(): void {
    const filter: LoginReportFilter = {
      from: this.from.value, to: this.to.value, studioId: this.studioId.value, username: this.username.value, eventType: this.eventType.value,
    };
    this.downloading.set(true);
    this.api.loginAuditsCsv(filter).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `login-report-${filter.from || 'start'}_to_${filter.to || 'now'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        this.downloading.set(false);
      },
      error: async (err: unknown) => {
        this.downloading.set(false);
        // With responseType 'blob' the error body is a Blob too; turn it back into a problem-details object.
        if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
          try { err = new HttpErrorResponse({ status: err.status, error: JSON.parse(await err.error.text()) }); } catch { /* keep as is */ }
        }
        this.snack.open(describeError(err), 'Close', { duration: 5000 });
      },
    });
  }
}
