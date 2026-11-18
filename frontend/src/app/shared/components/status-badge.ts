import { Component, computed, input } from '@angular/core';
import { statusColor } from '../status-colors';

/** One badge for order statuses and work statuses. Usage: <app-status-badge [status]="order.orderStatus" /> */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [style.--c]="color()">{{ status() }}</span>`,
  styles: `
    .badge {
      display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap;
      background: color-mix(in srgb, var(--c) 14%, white);
      color: color-mix(in srgb, var(--c) 68%, black);
      border: 1px solid color-mix(in srgb, var(--c) 30%, transparent);
    }
  `,
})
export class StatusBadge {
  readonly status = input.required<string>();
  protected readonly color = computed(() => statusColor(this.status()));
}
