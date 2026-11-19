import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { combineLatest, debounceTime, startWith, switchMap } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { LoginAudit } from '../../core/models/studio.models';
import { fromUtc, toIsoDate } from '../../shared/date-utils';

/** Who signed in, signed out, or failed to sign in. Admin only (needs the "owners" permission). Defaults to the last 7 days. */
@Component({
  selector: 'app-login-log-settings',
  imports: [ReactiveFormsModule, DatePipe, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    <p class="intro">Sign-ins, sign-outs and failed attempts. A session that simply times out is not recorded as a sign-out. Times are shown in your local time.</p>
    <div class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>From</mat-label><input matInput type="date" [formControl]="from" /></mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>To</mat-label><input matInput type="date" [formControl]="to" /></mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Username</mat-label><input matInput [formControl]="username" /></mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Event</mat-label>
        <mat-select [formControl]="eventType">
          <mat-option value="">All</mat-option>
          <mat-option value="Login">Sign in</mat-option>
          <mat-option value="Logout">Sign out</mat-option>
          <mat-option value="LoginFailed">Failed attempt</mat-option>
        </mat-select>
      </mat-form-field>
    </div>

    <table class="grid">
      <thead><tr><th>When</th><th>User</th><th>Event</th><th>IP address</th><th>Device</th></tr></thead>
      <tbody>
        @for (a of items(); track a.auditId) {
          <tr>
            <td>{{ fromUtc(a.occurredAt) | date: 'd MMM yyyy, h:mm:ss a' }}</td>
            <td><strong>{{ a.username }}</strong></td>
            <td><span class="evt" [class]="a.eventType">{{ label(a) }}</span></td>
            <td>{{ a.ipAddress || '—' }}</td>
            <td class="ua" [title]="a.userAgent || ''">{{ a.userAgent || '—' }}</td>
          </tr>
        } @empty { <tr><td colspan="5">No activity in this period.</td></tr> }
      </tbody>
    </table>
    @if (items().length >= 200) { <p class="intro">Showing the latest 200 events. Narrow the dates or user to see older ones.</p> }
  `,
  styles: `
    .intro { color: var(--mat-sys-on-surface-variant); margin: 0 0 12px; }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; mat-form-field { flex: 1 1 140px; } }
    .grid { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .ua { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--mat-sys-on-surface-variant); font-size: 12px; }
    .evt { padding: 2px 10px; border-radius: 999px; font-size: 12px; background: #e3f2fd; color: #0d47a1; }
    .evt.Logout { background: #eceff1; color: #37474f; }
    .evt.LoginFailed { background: #ffebee; color: #b71c1c; }
    @media (max-width: 719px) { thead { display: none; } tr, td { display: block; } td { border: 0; padding: 2px 0; } tr { border-bottom: 1px solid var(--mat-sys-outline-variant); padding: 8px 0; } }
  `,
})
export class LoginLogSettings {
  private readonly api = inject(StudioApi);
  protected readonly fromUtc = fromUtc;

  private readonly now = new Date();
  protected readonly from = new FormControl(toIsoDate(new Date(this.now.getFullYear(), this.now.getMonth(), this.now.getDate() - 6)), { nonNullable: true });
  protected readonly to = new FormControl(toIsoDate(this.now), { nonNullable: true });
  protected readonly username = new FormControl('', { nonNullable: true });
  protected readonly eventType = new FormControl('', { nonNullable: true });

  protected readonly items = toSignal(
    combineLatest([
      this.from.valueChanges.pipe(startWith(this.from.value)),
      this.to.valueChanges.pipe(startWith(this.to.value)),
      this.username.valueChanges.pipe(startWith('')),
      this.eventType.valueChanges.pipe(startWith('')),
    ]).pipe(
      debounceTime(250),
      switchMap(([from, to, username, eventType]) => this.api.loginAudits({ from, to, username, eventType })),
    ),
    { initialValue: [] as LoginAudit[] },
  );

  protected label(a: LoginAudit): string {
    return a.eventType === 'Login' ? 'Signed in' : a.eventType === 'Logout' ? 'Signed out' : 'Failed attempt';
  }
}
