import { Component, computed, input } from '@angular/core';

const COLORS: Record<string, string> = {
  'Pre-Order': 'grey', 'Pending': 'amber', 'Confirmed': 'blue', 'Shoot Completed': 'teal',
  'In Post-Production': 'purple', 'Delivered': 'green', 'Cancelled': 'red',
  'Not Started': 'grey', 'In Progress': 'amber', 'Completed': 'green',
};

/** One badge for order statuses and work statuses. Usage: <app-status-badge [status]="order.orderStatus" /> */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="color()">{{ status() }}</span>`,
  styles: `
    .badge { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 500; white-space: nowrap; }
    .grey { background: #eceff1; color: #455a64; }   .amber { background: #fff3e0; color: #e65100; }
    .blue { background: #e3f2fd; color: #0d47a1; }   .teal { background: #e0f2f1; color: #00695c; }
    .purple { background: #f3e5f5; color: #6a1b9a; } .green { background: #e8f5e9; color: #1b5e20; }
    .red { background: #ffebee; color: #b71c1c; }
  `,
})
export class StatusBadge {
  readonly status = input.required<string>();
  protected readonly color = computed(() => COLORS[this.status()] ?? 'grey');
}
