import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, debounceTime, map, of, startWith, switchMap } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { DateRangeReport } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { fromUtc, toIsoDate } from '../../shared/date-utils';
import { Pager, pageOf } from '../../shared/components/pager';
import { InrPipe } from '../../shared/pipes/inr.pipe';

interface Preset { label: string; range: () => [Date, Date]; }

/** Everything between two dates (orders, money in, money out) with a one-click Excel download. Defaults to this month. */
@Component({
  selector: 'app-reports',
  imports: [ReactiveFormsModule, DatePipe, RouterLink, InrPipe, Pager, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatTabsModule],
  template: `
    <header class="page-head blue">
      <span class="ico"><mat-icon>assessment</mat-icon></span>
      <h1>Reports <span class="sub">by date range</span></h1>
    </header>

    <div class="panel slim blue filters">
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>From</mat-label><input matInput type="date" [formControl]="from" /></mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>To</mat-label><input matInput type="date" [formControl]="to" /></mat-form-field>
      <button mat-flat-button type="button" class="download" [disabled]="!valid() || downloading()" (click)="download()">
        <mat-icon>download</mat-icon>{{ downloading() ? 'Preparing…' : 'Download Excel' }}
      </button>
    </div>
    <div class="presets">
      @for (p of presets; track p.label) { <button mat-stroked-button type="button" (click)="apply(p)">{{ p.label }}</button> }
    </div>

    @if (!valid()) {
      <p class="warn">Pick a start and end date; the end date cannot be before the start date.</p>
    } @else if (report(); as r) {
      <mat-tab-group animationDuration="0" mat-stretch-tabs="false" mat-align-tabs="start">
      <mat-tab label="Summary"><div class="pane">
      <div class="totals">
        <div class="blue"><small>Orders</small><strong>{{ r.orderCount }}</strong></div>
        <div class="purple"><small>Orders total</small><strong>{{ r.ordersTotal | inr }}</strong></div>
        <div class="green"><small>Revenue</small><strong>{{ r.revenue | inr }}</strong></div>
        <div class="red"><small>Expenses</small><strong>{{ r.expenses | inr }}</strong></div>
        <div [class]="r.netProfit >= 0 ? 'green' : 'red'"><small>Net profit</small><strong>{{ r.netProfit | inr }}</strong></div>
      </div>

      <section class="panel blue tablewrap">
        <h2>Orders <small>by event date</small></h2>
        <table class="grid dtable">
          <thead><tr><th>Date</th><th>Order</th><th>Client</th><th>Event</th><th>Status</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Balance</th><th class="num">Expenses</th></tr></thead>
          <tbody>
            @for (o of orderRows(); track o.orderId) {
              <tr>
                <td data-label="Date">{{ o.eventDate | date: 'd MMM yyyy' }}</td>
                <td data-label="Order"><a [routerLink]="['/orders', o.orderId]">{{ o.orderNumber }}</a></td>
                <td data-label="Client"><strong>{{ o.clientName }}</strong></td>
                <td data-label="Event">{{ o.eventType }}</td>
                <td data-label="Status">{{ o.orderStatus }}</td>
                <td data-label="Total" class="num">{{ o.totalAmount | inr }}</td>
                <td data-label="Paid" class="num">{{ o.totalPaid | inr }}</td>
                <td data-label="Balance" class="num">{{ o.balanceDue | inr }}</td>
                <td data-label="Expenses" class="num">{{ o.expenses | inr }}</td>
              </tr>
            } @empty { <tr><td colspan="9">No orders in this period.</td></tr> }
          </tbody>
        </table>
        <app-pager [total]="r.orders.length" [(page)]="ordersPage" />
      </section>

      <section class="panel green tablewrap">
        <h2>Payments received</h2>
        <table class="grid dtable">
          <thead><tr><th>Date</th><th>Order</th><th>Client</th><th>Type</th><th>Mode</th><th>Ref</th><th class="num">Amount</th></tr></thead>
          <tbody>
            @for (p of paymentRows(); track $index) {
              <tr>
                <td data-label="Date">{{ p.paymentDate | date: 'd MMM yyyy' }}</td>
                <td data-label="Order">{{ p.orderNumber }}</td>
                <td data-label="Client"><strong>{{ p.clientName }}</strong></td>
                <td data-label="Type">{{ p.paymentType }}</td>
                <td data-label="Mode">{{ p.paymentMode }}</td>
                <td data-label="Ref">{{ p.transactionRef || '—' }}</td>
                <td data-label="Amount" class="num">{{ p.amount | inr }}</td>
              </tr>
            } @empty { <tr><td colspan="7">No payments in this period.</td></tr> }
          </tbody>
        </table>
        <app-pager [total]="r.payments.length" [(page)]="paymentsPage" />
      </section>

      <section class="panel red tablewrap">
        <h2>Expenses <small>order expenses and album printing</small></h2>
        <table class="grid dtable">
          <thead><tr><th>Date</th><th>Order</th><th>Category</th><th>Description</th><th class="num">Amount</th></tr></thead>
          <tbody>
            @for (e of expenseRows(); track $index) {
              <tr>
                <td data-label="Date">{{ e.expenseDate | date: 'd MMM yyyy' }}</td>
                <td data-label="Order">{{ e.orderNumber }}</td>
                <td data-label="Category">{{ e.category }}</td>
                <td data-label="Description">{{ e.description || '—' }}</td>
                <td data-label="Amount" class="num">{{ e.amount | inr }}</td>
              </tr>
            } @empty { <tr><td colspan="5">No expenses in this period.</td></tr> }
          </tbody>
        </table>
        <app-pager [total]="r.expenseRows.length" [(page)]="expensesPage" />
      </section>
      </div></mat-tab>

      <!-- Who created / changed the orders. Kept here (not on the order page) so the order page stays about the job itself. -->
      <mat-tab label="Order activity"><div class="pane">
        <section class="panel slate tablewrap">
          <h2>Order activity <small>orders created or changed in this period</small></h2>
          <table class="grid dtable">
            <thead><tr><th>Order</th><th>Client</th><th>Status</th><th>Created by</th><th>Created</th><th>Last modified by</th><th>Last modified</th></tr></thead>
            <tbody>
              @for (a of activityRows(); track a.orderId) {
                <tr>
                  <td data-label="Order"><a [routerLink]="['/orders', a.orderId]">{{ a.orderNumber }}</a></td>
                  <td data-label="Client"><strong>{{ a.clientName }}</strong></td>
                  <td data-label="Status">{{ a.orderStatus }}</td>
                  <td data-label="Created by">{{ a.createdBy || '—' }}</td>
                  <td data-label="Created">{{ fromUtc(a.createdAt) | date: 'd MMM yyyy, h:mm a' }}</td>
                  <td data-label="Last modified by">{{ a.updatedBy || '—' }}</td>
                  <td data-label="Last modified">{{ a.updatedAt ? (fromUtc(a.updatedAt) | date: 'd MMM yyyy, h:mm a') : '—' }}</td>
                </tr>
              } @empty { <tr><td colspan="7">No orders were created or changed in this period.</td></tr> }
            </tbody>
          </table>
          <app-pager [total]="activityCount()" [(page)]="activityPage" />
        </section>
      </div></mat-tab>
      </mat-tab-group>
    }
  `,
  styles: `
    :host { display: block; max-width: 1200px; margin: 0 auto; }
    .filters { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; mat-form-field { flex: 1 1 150px; } }
    .download { height: 56px; }
    .presets { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
    .warn { color: var(--mat-sys-error); }
    .pane { padding-top: 16px; }
    .tablewrap { padding: 0 8px 8px; margin-bottom: 16px; overflow: hidden; }
    h2 { font-size: 16px; margin: 14px 8px 4px; }
    h2 small { font-weight: 400; color: var(--mat-sys-on-surface-variant); margin-left: 6px; }
    .totals { display: grid; gap: 10px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); margin-bottom: 16px; }
    .totals div {
      display: flex; flex-direction: column; padding: 10px 14px; border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); border-left: 5px solid var(--accent);
      background: color-mix(in srgb, var(--accent) 7%, white);
    }
    .totals small { color: var(--mat-sys-on-surface-variant); font-size: 12px; }
    .totals strong { font-size: 20px; color: color-mix(in srgb, var(--accent) 80%, black); }
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
export class Reports {
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);

  private readonly now = new Date();
  protected readonly from = new FormControl(toIsoDate(new Date(this.now.getFullYear(), this.now.getMonth(), 1)), { nonNullable: true });
  protected readonly to = new FormControl(toIsoDate(new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0)), { nonNullable: true });

  protected readonly presets: Preset[] = [
    { label: 'This month', range: () => [new Date(this.now.getFullYear(), this.now.getMonth(), 1), new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0)] },
    { label: 'Last month', range: () => [new Date(this.now.getFullYear(), this.now.getMonth() - 1, 1), new Date(this.now.getFullYear(), this.now.getMonth(), 0)] },
    { label: 'Last 3 months', range: () => [new Date(this.now.getFullYear(), this.now.getMonth() - 2, 1), new Date(this.now.getFullYear(), this.now.getMonth() + 1, 0)] },
    { label: 'This year', range: () => [new Date(this.now.getFullYear(), 0, 1), new Date(this.now.getFullYear(), 11, 31)] },
  ];

  protected readonly downloading = signal(false);

  private readonly range$ = combineLatest([
    this.from.valueChanges.pipe(startWith(this.from.value)),
    this.to.valueChanges.pipe(startWith(this.to.value)),
  ]).pipe(map(([from, to]) => ({ from, to })));

  private readonly range = toSignal(this.range$, { initialValue: { from: this.from.value, to: this.to.value } });

  /** Both dates filled in and in the right order (ISO dates compare correctly as strings). */
  protected readonly valid = computed(() => !!this.range().from && !!this.range().to && this.range().from <= this.range().to);

  protected readonly report = toSignal(
    this.range$.pipe(
      debounceTime(250),
      switchMap(({ from, to }) =>
        !from || !to || from > to
          ? of(null)
          : this.api.report(from, to).pipe(catchError((err) => { this.snack.open(describeError(err), 'Close', { duration: 5000 }); return of(null); })),
      ),
    ),
    { initialValue: null as DateRangeReport | null },
  );

  /** Each table shows 15 rows per page and returns to page 1 whenever a new report is loaded. The Excel file always has every row. */
  protected readonly ordersPage = linkedSignal({ source: this.report, computation: () => 1 });
  protected readonly paymentsPage = linkedSignal({ source: this.report, computation: () => 1 });
  protected readonly expensesPage = linkedSignal({ source: this.report, computation: () => 1 });
  protected readonly fromUtc = fromUtc;
  protected readonly activityPage = linkedSignal({ source: this.report, computation: () => 1 });
  // `activity` is missing when the API is an older build that has not been restarted yet: show an empty list, not a crash.
  protected readonly activityCount = computed(() => this.report()?.activity?.length ?? 0);
  protected readonly activityRows = computed(() => pageOf(this.report()?.activity ?? [], this.activityPage()));
  protected readonly orderRows = computed(() => pageOf(this.report()?.orders ?? [], this.ordersPage()));
  protected readonly paymentRows = computed(() => pageOf(this.report()?.payments ?? [], this.paymentsPage()));
  protected readonly expenseRows = computed(() => pageOf(this.report()?.expenseRows ?? [], this.expensesPage()));

  protected apply(p: Preset): void {
    const [from, to] = p.range();
    this.from.setValue(toIsoDate(from));
    this.to.setValue(toIsoDate(to));
  }

  protected download(): void {
    const { from, to } = this.range();
    this.downloading.set(true);
    this.api.reportExcel(from, to).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `BoscoStudio-report-${from}_to_${to}.xlsx`;
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
