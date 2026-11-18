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
import { InrPipe } from '../../../shared/pipes/inr.pipe';

/** Table on desktop, stacked cards on phones (pure CSS, see styles). */
@Component({
  selector: 'app-order-list',
  imports: [ReactiveFormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, RouterLink, DatePipe, InrPipe, StatusBadge],
  template: `
    <div class="title">
      <h1>Orders</h1>
      <a mat-flat-button routerLink="/orders/new"><mat-icon>add</mat-icon> New order</a>
    </div>
    <div class="filters">
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

    <table class="grid">
      <thead><tr><th>Order</th><th>Client</th><th>Event</th><th>Date</th><th>Status</th><th class="num">Total</th><th class="num">Balance</th></tr></thead>
      <tbody>
        @for (o of orders(); track o.orderId) {
          <tr [routerLink]="['/orders', o.orderId]">
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
  `,
  styles: `
    .title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; h1 { font-size: 22px; margin: 0; } }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .filters mat-form-field { flex: 1 1 220px; }
    .grid { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    tbody tr { cursor: pointer; } tbody tr:hover { background: var(--mat-sys-surface-container-low); }
    .num { text-align: right; } .due { color: var(--mat-sys-error); font-weight: 500; }
    @media (max-width: 719px) {
      thead { display: none; }
      tr, td { display: block; }
      tr { border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; margin-bottom: 10px; }
      td { display: flex; justify-content: space-between; border: 0; padding: 4px 0; text-align: right; }
      td::before { content: attr(data-label); color: var(--mat-sys-on-surface-variant); }
    }
  `,
})
export class OrderList {
  private readonly api = inject(StudioApi);
  protected readonly statuses = ORDER_STATUSES;
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
