import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { combineLatest, debounceTime, startWith, switchMap } from 'rxjs';
import { StudioApi } from '../../../core/api/studio-api';
import { ORDER_STATUSES } from '../../../core/models/studio.models';
import { StatusBadge } from '../../../shared/components/status-badge';
import { statusColor } from '../../../shared/status-colors';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

/** Table on desktop, stacked cards on phones (pure CSS, see styles). */
@Component({
  selector: 'app-order-list',
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, RouterLink, DatePipe, InrPipe, StatusBadge],
  template: `
    <header class="page-head blue">
      <span class="ico"><mat-icon>receipt_long</mat-icon></span>
      <h1>Orders <span class="sub">{{ orders().length }} shown</span></h1>
      <div class="actions"><a mat-flat-button routerLink="/orders/new"><mat-icon>add</mat-icon> New order</a></div>
    </header>
    <div class="panel slim blue filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Search client / order no.</mat-label>
        <input matInput [formControl]="search" />
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Status</mat-label>
        <mat-select [formControl]="status">
          <mat-option value="">All</mat-option>
          @for (s of statuses; track s) { <mat-option [value]="s">{{ s }}</mat-option> }
        </mat-select>
      </mat-form-field>
    </div>

    <section class="panel blue tablewrap">
    <table class="grid dtable">
      <thead><tr><th>Order</th><th>Client</th><th>Event</th><th>Date</th><th>Status</th><th class="num">Total</th><th class="num">Balance</th></tr></thead>
      <tbody>
        @for (o of orders(); track o.orderId) {
          <tr [routerLink]="['/orders', o.orderId]" [style.--c]="color(o.orderStatus)">
            <td data-label="Order">{{ o.orderNumber }}</td>
            <td data-label="Client"><strong>{{ o.clientName }}</strong></td>
            <td data-label="Event">{{ o.eventType }}</td>
            <td data-label="Date">{{ o.eventDate | date: 'd MMM yyyy' }}</td>
            <td data-label="Status"><app-status-badge [status]="o.orderStatus" /></td>
            <td data-label="Total" class="num">{{ o.totalAmount | inr }}</td>
            <td data-label="Balance" class="num" [class.due]="o.balanceDue > 0">{{ o.balanceDue | inr }}</td>
          </tr>
        } @empty { <tr><td colspan="7">No orders found.</td></tr> }
      </tbody>
    </table>
    </section>
  `,
  styles: `
    :host { display: block; max-width: 1200px; margin: 0 auto; }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .tablewrap { padding: 0 8px 8px; overflow: hidden; }
    .filters mat-form-field { flex: 1 1 220px; }
    .grid { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    /* status colour as a thin edge on every row, same colours as the badge and calendar */
    tbody tr { cursor: pointer; box-shadow: inset 4px 0 0 var(--c, transparent); } tbody tr:hover { background: color-mix(in srgb, var(--c, #999) 6%, transparent); }
    .num { text-align: right; } .due { color: var(--mat-sys-error); font-weight: 500; }
    @media (max-width: 719px) {
      thead { display: none; }
      tr, td { display: block; }
      tr { border: 1px solid var(--mat-sys-outline-variant); border-left: 4px solid var(--c); border-radius: 12px; padding: 8px 12px; margin-bottom: 10px; box-shadow: none; }
      td { display: flex; justify-content: space-between; border: 0; padding: 4px 0; text-align: right; }
      td::before { content: attr(data-label); color: var(--mat-sys-on-surface-variant); }
    }
  `,
})
export class OrderList {
  private readonly api = inject(StudioApi);
  protected readonly statuses = ORDER_STATUSES;
  protected readonly color = statusColor;
  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly status = new FormControl('', { nonNullable: true });

  protected readonly orders = toSignal(
    combineLatest([
      this.search.valueChanges.pipe(startWith(''), debounceTime(250)),
      this.status.valueChanges.pipe(startWith('')),
    ]).pipe(switchMap(([search, status]) => this.api.orders({ search, status }))),
    { initialValue: [] },
  );
}
