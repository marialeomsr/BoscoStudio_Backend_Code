import { Component, computed, input, signal } from '@angular/core';
import { MonthlyFinance } from '../../core/models/studio.models';
import { InrPipe } from '../pipes/inr.pipe';

/**
 * Revenue vs expenses per month: grouped columns on ONE axis (no dual axis).
 * Colours are categorical slots 1 and 2 of the validated palette (blue, orange: CVD dE 24.7, contrast >= 3:1).
 * Identity never relies on colour alone: legend with this month's values, tooltip, and a table view.
 */
@Component({
  selector: 'app-monthly-chart',
  imports: [InrPipe],
  template: `
    <div class="head">
      <h3>Revenue vs expenses <small>last 6 months</small></h3>
      <button type="button" class="link" (click)="showTable.set(!showTable())">{{ showTable() ? 'Show chart' : 'Show table' }}</button>
    </div>

    <ul class="legend" aria-label="Legend">
      <li><span class="key rev"></span>Revenue <strong>{{ latest()?.revenue | inr }}</strong><small>this month</small></li>
      <li><span class="key exp"></span>Expenses <strong>{{ latest()?.expenses | inr }}</strong><small>this month</small></li>
    </ul>

    @if (showTable()) {
      <table class="tbl">
        <thead><tr><th>Month</th><th class="num">Revenue</th><th class="num">Expenses</th></tr></thead>
        <tbody>
          @for (m of months(); track m.month) {
            <tr><td>{{ m.month }}</td><td class="num">{{ m.revenue | inr }}</td><td class="num">{{ m.expenses | inr }}</td></tr>
          }
        </tbody>
      </table>
    } @else {
      <div class="plot" role="img" [attr.aria-label]="summary()">
        <div class="yaxis" aria-hidden="true">
          @for (t of ticks(); track t.value) { <span [style.bottom.%]="t.pct">{{ t.label }}</span> }
        </div>
        <div class="area">
          <div class="grid" aria-hidden="true">
            @for (t of ticks(); track t.value) { <i [style.bottom.%]="t.pct"></i> }
          </div>
          <div class="cols">
            @for (m of months(); track m.month; let i = $index) {
              <div class="col" tabindex="0" [class.active]="active() === i"
                   (pointerenter)="active.set(i)" (pointerleave)="active.set(null)" (focus)="active.set(i)" (blur)="active.set(null)">
                <div class="bars">
                  <span class="bar rev" [style.height.%]="pct(m.revenue)"></span>
                  <span class="bar exp" [style.height.%]="pct(m.expenses)"></span>
                </div>
                <span class="xlabel">{{ m.short }}</span>
                @if (active() === i) {
                  <div class="tip" [class.left]="i >= 3" role="status">
                    <div class="tip-title">{{ m.month }}</div>
                    <div class="tip-row"><span class="key rev"></span><strong>{{ m.revenue | inr }}</strong><span>Revenue</span></div>
                    <div class="tip-row"><span class="key exp"></span><strong>{{ m.expenses | inr }}</strong><span>Expenses</span></div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block; --surface: #fcfcfb; --ink: #0b0b0b; --ink-2: #52514e; --ink-muted: #898781;
      --grid: #e1e0d9; --axis: #c3c2b7; --rev: #2a78d6; --exp: #eb6834;
      background: var(--surface); color: var(--ink); border: 1px solid rgba(11, 11, 11, .10); border-radius: 14px; padding: 12px 16px 14px;
    }
    .head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
    h3 { margin: 0; font-size: 16px; font-weight: 500; } h3 small { color: var(--ink-2); font-weight: 400; font-size: 12px; margin-left: 6px; }
    .link { background: none; border: 0; padding: 4px 0; font: inherit; font-size: 13px; color: var(--rev); cursor: pointer; text-decoration: underline; }
    .legend { list-style: none; margin: 8px 0 12px; padding: 0; display: flex; flex-wrap: wrap; gap: 4px 20px; font-size: 13px; color: var(--ink-2); }
    .legend li { display: flex; align-items: center; gap: 6px; } .legend strong { color: var(--ink); } .legend small { color: var(--ink-muted); }
    .key { width: 12px; height: 12px; border-radius: 3px; flex: none; } .key.rev { background: var(--rev); } .key.exp { background: var(--exp); }

    .plot { display: flex; height: 190px; padding-top: 8px; }
    .yaxis { position: relative; width: 38px; flex: none; margin-bottom: 22px; }
    .yaxis span { position: absolute; right: 6px; transform: translateY(50%); font-size: 11px; color: var(--ink-muted); }
    .area { position: relative; flex: 1; min-width: 0; }
    .grid { position: absolute; inset: 0 0 22px 0; } .grid i { position: absolute; left: 0; right: 0; height: 1px; background: var(--grid); }
    .grid i:first-child { background: var(--axis); }
    .cols { position: absolute; inset: 0; display: grid; grid-template-columns: repeat(6, 1fr); }
    .col { position: relative; display: flex; flex-direction: column; outline: none; border-radius: 6px; cursor: default; }
    .col.active, .col:focus-visible { background: rgba(11, 11, 11, .04); }
    .bars { flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 2px; }   /* 2px surface gap between bars */
    .bar { width: 100%; max-width: 24px; min-height: 0; border-radius: 4px 4px 0 0; transition: filter .12s; }   /* 4px data-end, square at baseline */
    .bar.rev { background: var(--rev); } .bar.exp { background: var(--exp); }
    .col.active .bar { filter: brightness(1.12); }
    .xlabel { height: 22px; line-height: 22px; text-align: center; font-size: 11px; color: var(--ink-muted); }

    .tip {
      position: absolute; z-index: 5; top: 4px; left: 50%; transform: translateX(-30%); min-width: 150px; padding: 8px 10px;
      background: var(--surface); border: 1px solid rgba(11, 11, 11, .15); border-radius: 8px; box-shadow: 0 4px 14px rgba(0, 0, 0, .15); pointer-events: none;
    }
    .tip.left { transform: translateX(-85%); }
    .tip-title { font-size: 12px; color: var(--ink-2); margin-bottom: 4px; }
    .tip-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--ink-2); }
    .tip-row strong { color: var(--ink); font-size: 13px; } .tip-row .key { width: 14px; height: 3px; border-radius: 2px; }

    .tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
    .tbl th, .tbl td { padding: 6px 4px; text-align: left; border-bottom: 1px solid var(--grid); } .tbl .num { text-align: right; font-variant-numeric: tabular-nums; }
  `,
})
export class MonthlyChart {
  readonly data = input.required<MonthlyFinance[]>();

  protected readonly active = signal<number | null>(null);
  protected readonly showTable = signal(false);

  protected readonly months = computed(() => this.data().map((m) => ({ ...m, short: m.month.split(' ')[0] })));
  protected readonly latest = computed(() => this.data().at(-1));

  /** Round the axis max up to 1, 2 or 5 x 10^n so ticks are clean numbers. */
  private readonly max = computed(() => {
    const raw = Math.max(1, ...this.data().flatMap((m) => [m.revenue, m.expenses]));
    const pow = 10 ** Math.floor(Math.log10(raw));
    const n = raw / pow;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
  });

  protected readonly ticks = computed(() => {
    const fmt = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
    return [0, 0.25, 0.5, 0.75, 1].map((f) => ({ value: f, pct: f * 100, label: f === 0 ? '0' : fmt.format(f * this.max()) }));
  });

  protected readonly summary = computed(() =>
    'Revenue and expenses per month. ' + this.months().map((m) => `${m.month}: revenue ${m.revenue}, expenses ${m.expenses}`).join('; '));

  protected pct(value: number): number {
    return Math.min(100, (value / this.max()) * 100);
  }
}
