import { DatePipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { combineLatest, startWith, switchMap } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { PAYMENT_MODES, PaymentLedgerItem } from '../../core/models/studio.models';
import { toIsoDate } from '../../shared/date-utils';
import { InrPipe } from '../../shared/pipes/inr.pipe';

/** Every payment received, newest first, with totals. Defaults to the current month. */
@Component({
  selector: 'app-payments',
  imports: [ReactiveFormsModule, DatePipe, RouterLink, InrPipe, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <h1>Payments</h1>
    <div class="filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>From</mat-label><input matInput type="date" [formControl]="from" /></mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>To</mat-label><input matInput type="date" [formControl]="to" /></mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Mode</mat-label>
        <mat-select [formControl]="mode"><mat-option value="">All</mat-option>@for (m of modes; track m) { <mat-option [value]="m">{{ m }}</mat-option> }</mat-select>
      </mat-form-field>
    </div>

    <div class="totals">
      <div><small>Received</small><strong>{{ total() | inr }}</strong></div>
      <div><small>Payments</small><strong>{{ items().length }}</strong></div>
      @for (m of byMode(); track m.mode) { <div><small>{{ m.mode }}</small><strong>{{ m.amount | inr }}</strong></div> }
    </div>

    <table class="grid">
      <thead><tr><th>Date</th><th>Client</th><th>Order</th><th>Type</th><th>Mode</th><th>Ref</th><th class="num">Amount</th></tr></thead>
      <tbody>
        @for (p of items(); track p.paymentId) {
          <tr>
            <td data-label="Date">{{ p.paymentDate | date: 'd MMM yyyy' }}</td>
            <td data-label="Client"><strong>{{ p.clientName }}</strong></td>
            <td data-label="Order"><a [routerLink]="['/orders', p.orderId]">{{ p.orderNumber }}</a></td>
            <td data-label="Type">{{ p.paymentType }}</td>
            <td data-label="Mode">{{ p.paymentMode }}</td>
            <td data-label="Ref">{{ p.transactionRef || '—' }}</td>
            <td data-label="Amount" class="num">{{ p.amount | inr }}</td>
          </tr>
        } @empty { <tr><td colspan="7">No payments in this period.</td></tr> }
      </tbody>
    </table>
  `,
  styles: `
    h1 { font-size: 22px; margin: 0 0 12px; }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; mat-form-field { flex: 1 1 150px; } }
    .totals { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); margin-bottom: 16px; }
    .totals div { background: var(--mat-sys-surface-container-low); border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; }
    .totals strong { font-size: 18px; }
    .grid { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .num { text-align: right; }
    a { color: var(--mat-sys-primary); }
    @media (max-width: 719px) {
      thead { display: none; } tr, td { display: block; }
      tr { border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; margin-bottom: 10px; }
      td { display: flex; justify-content: space-between; border: 0; padding: 4px 0; text-align: right; }
      td::before { content: attr(data-label); color: var(--mat-sys-on-surface-variant); }
    }
  `,
})
export class Payments {
  private readonly api = inject(StudioApi);
  protected readonly modes = PAYMENT_MODES;

  private readonly now = new Date();
  protected readonly from = new FormControl(toIsoDate(new Date(this.now.getFullYear(), this.now.getMonth(), 1)), { nonNullable: true });
  protected readonly to = new FormControl(toIsoDate(new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0)), { nonNullable: true });
  protected readonly mode = new FormControl('', { nonNullable: true });

  protected readonly items = toSignal(
    combineLatest([
      this.from.valueChanges.pipe(startWith(this.from.value)),
      this.to.valueChanges.pipe(startWith(this.to.value)),
      this.mode.valueChanges.pipe(startWith('')),
    ]).pipe(switchMap(([from, to, mode]) => this.api.paymentLedger({ from, to, mode }))),
    { initialValue: [] as PaymentLedgerItem[] },
  );

  protected readonly total = computed(() => this.items().reduce((s, p) => s + p.amount, 0));
  protected readonly byMode = computed(() => {
    const m = new Map<string, number>();
    for (const p of this.items()) m.set(p.paymentMode, (m.get(p.paymentMode) ?? 0) + p.amount);
    return [...m].map(([mode, amount]) => ({ mode, amount }));
  });
}
