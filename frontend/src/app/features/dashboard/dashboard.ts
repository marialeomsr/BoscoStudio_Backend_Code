import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { StudioApi } from '../../core/api/studio-api';
import { Dashboard as DashboardData } from '../../core/models/studio.models';
import { StatusBadge } from '../../shared/components/status-badge';
import { InrPipe } from '../../shared/pipes/inr.pipe';

@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, RouterLink, DatePipe, InrPipe, StatusBadge],
  template: `
    @if (data(); as d) {
      <div class="kpis">
        <mat-card><mat-card-content><small>Upcoming shoots (7 days)</small><strong>{{ d.upcomingShootCount }}</strong></mat-card-content></mat-card>
        <mat-card><mat-card-content><small>Pending client balances</small><strong>{{ d.pendingClientBalance | inr }}</strong><span>{{ d.ordersWithBalance }} orders</span></mat-card-content></mat-card>
        <mat-card><mat-card-content><small>Albums awaiting action</small><strong>{{ d.albumsAwaitingAction }}</strong></mat-card-content></mat-card>
        <mat-card><mat-card-content><small>This month: revenue vs expenses</small>
          <strong>{{ d.monthRevenue | inr }}</strong><span>spent {{ d.monthExpenses | inr }}</span></mat-card-content></mat-card>
      </div>

      <h3>Next shoots</h3>
      @for (o of d.upcomingShoots; track o.orderId) {
        <a class="row" [routerLink]="['/orders', o.orderId]">
          <div><strong>{{ o.clientName }}</strong><br /><small>{{ o.eventType }} · {{ o.eventDate | date: 'EEE, d MMM' }}</small></div>
          <app-status-badge [status]="o.orderStatus" />
        </a>
      } @empty { <p>No shoots in the next 7 days.</p> }
    } @else if (error()) {
      <p class="error">{{ error() }}</p>
    }
  `,
  styles: `
    .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); }
    mat-card-content { display: flex; flex-direction: column; gap: 4px; padding-top: 16px; }
    strong { font-size: 24px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--mat-sys-outline-variant); color: inherit; text-decoration: none; }
    .error { color: var(--mat-sys-error); }
  `,
})
export class Dashboard {
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly error = signal('');

  constructor() {
    inject(StudioApi).dashboard().subscribe({
      next: (d) => this.data.set(d),
      error: () => this.error.set('Could not load the dashboard.'),
    });
  }
}
