import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, combineLatest, debounceTime, startWith, switchMap, tap } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { AuthService } from '../../core/auth/auth.service';
import { ClientRecord } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { Pager, pageOf } from '../../shared/components/pager';
import { ClientEditDialog } from './client-edit-dialog';

/** Client records: search, add, edit, delete (only when the client has no orders). Table on desktop, cards on phones. */
@Component({
  selector: 'app-clients',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, Pager],
  template: `
    <header class="page-head teal">
      <span class="ico"><mat-icon>groups</mat-icon></span>
      <h1>Clients <span class="sub">{{ clients().length }} shown</span></h1>
      <div class="actions"><button mat-flat-button (click)="add()"><mat-icon>add</mat-icon> New client</button></div>
    </header>
    <div class="panel slim teal">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search">
        <mat-label>Search name, phone or email</mat-label>
        <input matInput [formControl]="search" />
      </mat-form-field>
    </div>

    <section class="panel teal tablewrap">
    <table class="grid dtable">
      <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th class="num">Orders</th><th></th></tr></thead>
      <tbody>
        @for (c of rows(); track c.clientId) {
          <tr>
            <td data-label="Name"><strong>{{ c.fullName }}</strong>@if (c.notes) { <div class="muted">{{ c.notes }}</div> }</td>
            <td data-label="Phone">
              <a [href]="'tel:' + c.phone">{{ c.phone }}</a>
              @if (c.whatsAppNo) { · <a [href]="'https://wa.me/' + c.whatsAppNo.replace('+', '')" target="_blank" rel="noopener">WhatsApp</a> }
            </td>
            <td data-label="Email">{{ c.email || '—' }}</td>
            <td data-label="Orders" class="num">{{ c.orderCount }}</td>
            <td class="end">
              <button mat-icon-button aria-label="Edit client" (click)="edit(c)"><mat-icon>edit</mat-icon></button>
              @if (auth.can('clients.delete')) { <button mat-icon-button aria-label="Delete client" (click)="remove(c)"><mat-icon>delete</mat-icon></button> }
            </td>
          </tr>
        } @empty { <tr><td colspan="5" class="muted">No clients found.</td></tr> }
      </tbody>
    </table>
    <app-pager [total]="clients().length" [(page)]="page" />
    </section>
  `,
  styles: `
    :host { display: block; max-width: 1000px; margin: 0 auto; }
    .search { width: 100%; margin-bottom: 8px; }
    .panel.slim { margin-bottom: 16px; } .tablewrap { padding: 0 8px 8px; overflow: hidden; }
    .grid { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); vertical-align: top; }
    .num { text-align: right; } .end { text-align: right; white-space: nowrap; }
    .muted { color: var(--mat-sys-on-surface-variant); font-size: 12px; } a { color: var(--mat-sys-primary); }
    @media (max-width: 719px) {
      thead { display: none; } tr, td { display: block; }
      tr { border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; margin-bottom: 10px; }
      td { display: flex; justify-content: space-between; border: 0; padding: 4px 0; text-align: right; }
      td[data-label]::before { content: attr(data-label); color: var(--mat-sys-on-surface-variant); margin-right: 12px; }
      td.end { justify-content: flex-end; }
    }
  `,
})
export class Clients {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(StudioApi);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly search = new FormControl('', { nonNullable: true });
  private readonly refresh = new BehaviorSubject<void>(undefined);

  /** 15 per page. A new search goes back to page 1; adding / editing / deleting a client keeps you on the same page. */
  protected readonly page = signal(1);

  protected readonly clients = toSignal(
    combineLatest([this.search.valueChanges.pipe(startWith(''), debounceTime(250), tap(() => this.page.set(1))), this.refresh]).pipe(
      switchMap(([q]) => this.api.clients(q)),
    ),
    { initialValue: [] as ClientRecord[] },
  );

  protected readonly rows = computed(() => pageOf(this.clients(), this.page()));

  protected add(): void {
    ClientEditDialog.open(this.dialog, null).subscribe((saved) => {
      if (saved) { this.snack.open(`${saved.fullName} added`, 'OK', { duration: 2500 }); this.refresh.next(); }
    });
  }

  protected edit(c: ClientRecord): void {
    ClientEditDialog.open(this.dialog, c).subscribe((saved) => {
      if (saved) { this.snack.open('Client updated', 'OK', { duration: 2500 }); this.refresh.next(); }
    });
  }

  protected remove(c: ClientRecord): void {
    if (c.orderCount > 0) {
      this.snack.open(`${c.fullName} has ${c.orderCount} order(s) and cannot be deleted. Edit the details instead.`, 'OK', { duration: 5000 });
      return;
    }
    ConfirmDialog.ask(this.dialog, { title: `Delete ${c.fullName}?`, message: 'This cannot be undone.', confirmText: 'Delete' })
      .subscribe((yes) => yes && this.api.deleteClient(c.clientId).subscribe({
        next: () => { this.snack.open('Client deleted', 'OK', { duration: 2500 }); this.refresh.next(); },
        error: (e) => this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }),
      }));
  }
}
