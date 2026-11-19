import { Component, computed, input, model } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

/** Rows per page on every list. */
export const PAGE_SIZE = 15;

/** The rows of one page (1-based), clamped so a shrinking list never leaves you on an empty page. */
export function pageOf<T>(items: readonly T[], page: number, size = PAGE_SIZE): T[] {
  const last = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(1, page), last);
  return items.slice((p - 1) * size, p * size);
}

/** "Showing 16–30 of 47" with Previous / Next. Renders nothing when everything fits on one page. */
@Component({
  selector: 'app-pager',
  imports: [MatButtonModule, MatIconModule],
  template: `
    @if (pages() > 1) {
      <nav class="pager" aria-label="Pagination">
        <span class="info">Showing {{ from() }}–{{ to() }} of {{ total() }}</span>
        <span class="buttons">
          <button mat-stroked-button type="button" [disabled]="current() <= 1" (click)="page.set(current() - 1)">
            <mat-icon>chevron_left</mat-icon> Previous
          </button>
          <span class="of">Page {{ current() }} of {{ pages() }}</span>
          <button mat-stroked-button type="button" [disabled]="current() >= pages()" (click)="page.set(current() + 1)">
            Next <mat-icon iconPositionEnd>chevron_right</mat-icon>
          </button>
        </span>
      </nav>
    }
  `,
  styles: `
    .pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 12px 8px 4px; }
    .info, .of { color: var(--mat-sys-on-surface-variant); font-size: 13px; }
    .buttons { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    @media (max-width: 599px) { .pager { justify-content: center; } }
  `,
})
export class Pager {
  readonly total = input.required<number>();
  readonly size = input(PAGE_SIZE);
  /** Two-way: [(page)]="page". */
  readonly page = model(1);

  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.total() / this.size())));
  protected readonly current = computed(() => Math.min(Math.max(1, this.page()), this.pages()));
  protected readonly from = computed(() => (this.total() === 0 ? 0 : (this.current() - 1) * this.size() + 1));
  protected readonly to = computed(() => Math.min(this.current() * this.size(), this.total()));
}
