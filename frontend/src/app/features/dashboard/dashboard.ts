import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { StudioApi } from '../../core/api/studio-api';
import { Dashboard as DashboardData, DueBalance, OrderSummary } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { MonthlyChart } from '../../shared/components/monthly-chart';
import { StatusBadge } from '../../shared/components/status-badge';
import { parseIsoDate } from '../../shared/date-utils';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { RecordPaymentDialog } from './record-payment-dialog';

/**
 * Owner home. Top to bottom: quick actions, KPI cards, overdue alert, shoots (upcoming | completed),
 * money (payments to collect | 6-month chart), albums-by-stage strip.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, MatButtonModule, MatIconModule, InrPipe, StatusBadge, MonthlyChart],
  template: `
    @if (data(); as d) {
      <div class="quick">
        <a mat-flat-button routerLink="/orders/new"><mat-icon>add</mat-icon> New order</a>
        <button mat-flat-button class="tonal" (click)="recordPayment()"><mat-icon>payments</mat-icon> Record payment</button>
      </div>

      <div class="kpis">
        <a class="kpi blue" routerLink="/calendar">
          <span class="ico"><mat-icon>event_upcoming</mat-icon></span>
          <span class="txt"><small>Upcoming shoots (7 days)</small><strong>{{ d.upcomingShootCount }}</strong></span>
        </a>
        <a class="kpi amber" routerLink="/orders">
          <span class="ico"><mat-icon>account_balance_wallet</mat-icon></span>
          <span class="txt"><small>Pending client balances</small><strong>{{ d.pendingClientBalance | inr }}</strong><em>{{ d.ordersWithBalance }} order(s)</em></span>
        </a>
        <a class="kpi purple" routerLink="/albums">
          <span class="ico"><mat-icon>photo_album</mat-icon></span>
          <span class="txt"><small>Albums awaiting action</small><strong>{{ d.albumsAwaitingAction }}</strong></span>
        </a>
        <a class="kpi green" routerLink="/payments">
          <span class="ico"><mat-icon>trending_up</mat-icon></span>
          <span class="txt"><small>This month: revenue</small><strong>{{ d.monthRevenue | inr }}</strong><em>spent {{ d.monthExpenses | inr }}</em></span>
        </a>
      </div>

      @if (d.overdueShoots.length) {
        <section class="panel red alert">
          <h3><mat-icon>warning</mat-icon> Needs update <small>shoot date passed, still Confirmed</small></h3>
          @for (o of d.overdueShoots; track o.orderId) {
            <div class="row">
              <a class="grow" [routerLink]="['/orders', o.orderId]">
                <strong>{{ o.clientName }}</strong>
                <small>{{ o.eventType }} · {{ o.eventDate | date: 'EEE, d MMM' }} · {{ daysAgo(o.eventDate) }}</small>
              </a>
              <button mat-stroked-button [disabled]="busy()" (click)="markCompleted(o)">Mark shoot completed</button>
            </div>
          }
        </section>
      }

      <div class="split">
        <section class="panel blue">
          <h3><mat-icon>event_upcoming</mat-icon> Upcoming shoots <small>next 7 days</small></h3>
          @for (o of d.upcomingShoots; track o.orderId) {
            <a class="row" [routerLink]="['/orders', o.orderId]">
              <div class="grow"><strong>{{ o.clientName }}</strong><small>{{ o.eventType }} · {{ o.eventDate | date: 'EEE, d MMM' }}</small></div>
              <app-status-badge [status]="o.orderStatus" />
            </a>
          } @empty { <p class="muted">No upcoming shoots in the next 7 days.</p> }
        </section>

        <section class="panel green">
          <h3><mat-icon>task_alt</mat-icon> Recently completed <small>last 30 days</small></h3>
          @for (o of d.completedShoots; track o.orderId) {
            <a class="row" [routerLink]="['/orders', o.orderId]">
              <div class="grow"><strong>{{ o.clientName }}</strong><small>{{ o.eventType }} · {{ o.eventDate | date: 'EEE, d MMM' }}</small></div>
              <app-status-badge [status]="o.orderStatus" />
            </a>
          } @empty { <p class="muted">No completed shoots yet.</p> }
        </section>
      </div>

      <div class="split">
        <section class="panel amber">
          <h3><mat-icon>account_balance_wallet</mat-icon> Payments to collect
            <small>shoot within 7 days or done · {{ d.dueBalanceTotal | inr }}</small></h3>
          @for (b of d.dueBalances; track b.orderId) {
            <div class="row">
              <a class="grow" [routerLink]="['/orders', b.orderId]">
                <strong>{{ b.clientName }}</strong>
                <small>{{ b.orderNumber }} · {{ dueText(b.eventDate) }}</small>
              </a>
              <strong class="amount">{{ b.balanceDue | inr }}</strong>
              @if (digits(b)) {
                <a mat-icon-button [href]="'tel:' + (b.phone ?? '')" aria-label="Call {{ b.clientName }}"><mat-icon>call</mat-icon></a>
                <a mat-icon-button class="wa" [href]="whatsApp(b)" target="_blank" rel="noopener" aria-label="WhatsApp {{ b.clientName }}"><mat-icon>chat</mat-icon></a>
              }
            </div>
          } @empty { <p class="muted">Nothing to collect right now.</p> }
          @if (d.dueBalanceCount > d.dueBalances.length) { <p class="muted">+ {{ d.dueBalanceCount - d.dueBalances.length }} more in Orders.</p> }
        </section>

        <app-monthly-chart [data]="d.lastSixMonths" />
      </div>

      <section class="panel purple">
        <h3><mat-icon>photo_album</mat-icon> Albums by stage <small>tap a stage to see them</small></h3>
        <div class="stages">
          @for (s of d.albumsByStage; track s.stage; let i = $index) {
            <a class="stage" [class.zero]="s.count === 0" [routerLink]="['/albums']" [queryParams]="{ stage: s.stage }">
              <strong>{{ s.count }}</strong><small>{{ s.stage }}</small>
            </a>
          }
        </div>
      </section>
    } @else if (error()) {
      <p class="error">{{ error() }}</p>
    }
  `,
  styles: `
    :host { display: block; max-width: 1200px; margin: 0 auto; }

    /* One accent colour per card/panel; everything else is derived from it. */
    .blue { --accent: #1976d2; } .amber { --accent: #f57c00; } .purple { --accent: #8e24aa; } .green { --accent: #2e7d32; } .red { --accent: #c62828; }

    .quick { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .quick > * { flex: 1 1 150px; max-width: 240px; }
    @media (min-width: 600px) { .quick > * { flex: 0 0 auto; } }
    .tonal { --mat-button-filled-container-color: var(--mat-sys-secondary-container); --mat-button-filled-label-text-color: var(--mat-sys-on-secondary-container); }

    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
    .kpi {
      display: flex; align-items: center; gap: 14px; padding: 14px 16px; text-decoration: none; color: inherit;
      border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); border-left: 5px solid var(--accent);
      border-radius: 14px; background: color-mix(in srgb, var(--accent) 7%, white); transition: box-shadow .15s, transform .15s;
    }
    .kpi:hover { box-shadow: 0 2px 10px color-mix(in srgb, var(--accent) 25%, transparent); transform: translateY(-1px); }
    .ico { width: 44px; height: 44px; flex: none; border-radius: 12px; display: grid; place-items: center; color: #fff; background: var(--accent); }
    .txt { display: flex; flex-direction: column; min-width: 0; }
    .txt small { color: var(--mat-sys-on-surface-variant); font-size: 12px; }
    .txt strong { font-size: 24px; line-height: 1.2; color: color-mix(in srgb, var(--accent) 80%, black); }
    .txt em { font-style: normal; font-size: 12px; color: var(--mat-sys-on-surface-variant); }

    /* Side by side on desktop, stacked on phones */
    .split { display: grid; gap: 16px; grid-template-columns: 1fr; margin-top: 16px; align-items: start; }
    @media (min-width: 900px) { .split { grid-template-columns: 1fr 1fr; } }

    .panel {
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); border-top: 4px solid var(--accent);
      border-radius: 14px; padding: 4px 16px 8px; background: color-mix(in srgb, var(--accent) 3%, white);
    }
    .panel.alert { margin-top: 16px; background: color-mix(in srgb, var(--accent) 6%, white); border-color: color-mix(in srgb, var(--accent) 45%, transparent); }
    section.panel.purple { margin-top: 16px; }
    h3 { display: flex; align-items: center; gap: 8px; margin: 12px 0 4px; font-size: 16px; font-weight: 500; color: color-mix(in srgb, var(--accent) 80%, black); }
    h3 small { color: var(--mat-sys-on-surface-variant); font-weight: 400; font-size: 12px; margin-left: auto; text-align: right; }

    .row {
      display: flex; align-items: center; gap: 8px; padding: 8px 6px; color: inherit; text-decoration: none;
      border-bottom: 1px solid color-mix(in srgb, var(--accent) 15%, transparent); border-radius: 6px;
    }
    .row:last-of-type { border-bottom: 0; }
    a.row:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
    .grow { flex: 1; min-width: 0; display: flex; flex-direction: column; color: inherit; text-decoration: none; }
    .row small { color: var(--mat-sys-on-surface-variant); }
    .amount { font-variant-numeric: tabular-nums; color: color-mix(in srgb, var(--accent) 75%, black); white-space: nowrap; }
    .wa { color: #1fa855; }

    .stages { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); padding: 8px 0 8px; }
    .stage {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 2px; padding: 10px 6px; text-decoration: none; color: inherit;
      border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent); border-radius: 12px; background: color-mix(in srgb, var(--accent) 6%, white);
    }
    .stage strong { font-size: 22px; color: color-mix(in srgb, var(--accent) 80%, black); }
    .stage small { font-size: 11px; color: var(--mat-sys-on-surface-variant); }
    .stage.zero { opacity: .55; } .stage:hover { box-shadow: 0 2px 8px color-mix(in srgb, var(--accent) 25%, transparent); }

    .muted { color: var(--mat-sys-on-surface-variant); padding: 8px 0; margin: 0; }
    .error { color: var(--mat-sys-error); }
  `,
})
export class Dashboard {
  private readonly api = inject(StudioApi);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly data = signal<DashboardData | null>(null);
  protected readonly error = signal('');
  protected readonly busy = signal(false);

  constructor() {
    this.load();
  }

  protected recordPayment(): void {
    RecordPaymentDialog.open(this.dialog).subscribe((saved) => saved && this.load());
  }

  protected markCompleted(o: OrderSummary): void {
    this.busy.set(true);
    this.api.changeStatus(o.orderId, 'Shoot Completed').subscribe({
      next: () => { this.busy.set(false); this.snack.open(`${o.clientName}: Shoot Completed`, 'OK', { duration: 2500 }); this.load(); },
      error: (e) => { this.busy.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  // ---------- Date helpers ----------

  private daysFromToday(iso: string): number {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((parseIsoDate(iso).getTime() - t.getTime()) / 86_400_000);
  }

  protected daysAgo(iso: string): string {
    const n = -this.daysFromToday(iso);
    return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
  }

  protected dueText(iso: string): string {
    const n = this.daysFromToday(iso);
    return n === 0 ? 'shoot today' : n > 0 ? `shoot in ${n} day${n === 1 ? '' : 's'}` : `shoot was ${-n} day${n === -1 ? '' : 's'} ago`;
  }

  // ---------- Contact helpers (call / WhatsApp) ----------

  /** Digits only, with the +91 country code added for plain 10-digit Indian numbers. */
  protected digits(b: DueBalance): string {
    const raw = (b.whatsAppNo || b.phone || '').replace(/\D/g, '');
    return raw.length === 10 ? `91${raw}` : raw;
  }

  protected whatsApp(b: DueBalance): string {
    const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(b.balanceDue);
    const text = `Hello ${b.clientName}, a gentle reminder about the pending balance of ${amount} for ${b.orderNumber}. Thank you!`;
    return `https://wa.me/${this.digits(b)}?text=${encodeURIComponent(text)}`;
  }

  private load(): void {
    this.api.dashboard().subscribe({
      next: (d) => this.data.set(d),
      error: () => this.error.set('Could not load the dashboard.'),
    });
  }
}
