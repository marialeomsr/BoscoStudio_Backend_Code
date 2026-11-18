import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { CalendarItem } from '../../core/models/studio.models';
import { addDays, parseIsoDate, startOfWeek, toIsoDate } from '../../shared/date-utils';
import { statusColor } from '../../shared/status-colors';

type View = 'month' | 'week' | 'day';
interface Cell { iso: string; date: Date; inMonth: boolean; isToday: boolean; items: CalendarItem[]; }

/** Month / Week / Day agenda fed by GET /api/orders/calendar. Month grid on desktop collapses to a compact grid + day agenda on phones. */
@Component({
  selector: 'app-calendar',
  imports: [DatePipe, NgTemplateOutlet, RouterLink, MatButtonModule, MatIconModule],
  templateUrl: './calendar.html',
  styleUrl: './calendar.scss',
})
export class Calendar {
  private readonly api = inject(StudioApi);

  protected readonly view = signal<View>('month');
  protected readonly cursor = signal(new Date());
  protected readonly selectedIso = signal(toIsoDate(new Date()));
  protected readonly color = statusColor;
  protected readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  /** Visible range, including the leading/trailing days shown in the month grid. */
  private readonly range = computed(() => {
    const c = this.cursor();
    if (this.view() === 'day') return { from: toIsoDate(c), to: toIsoDate(c) };
    if (this.view() === 'week') { const s = startOfWeek(c); return { from: toIsoDate(s), to: toIsoDate(addDays(s, 6)) }; }
    const gridStart = startOfWeek(new Date(c.getFullYear(), c.getMonth(), 1));
    return { from: toIsoDate(gridStart), to: toIsoDate(addDays(gridStart, 41)) };
  });

  private readonly items = toSignal(
    toObservable(this.range).pipe(switchMap((r) => this.api.calendar(r.from, r.to))),
    { initialValue: [] as CalendarItem[] },
  );

  private readonly byDate = computed(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const i of this.items()) map.set(i.eventDate, [...(map.get(i.eventDate) ?? []), i]);
    return map;
  });

  private cell(d: Date, month: number): Cell {
    const iso = toIsoDate(d);
    return { iso, date: d, inMonth: d.getMonth() === month, isToday: iso === toIsoDate(new Date()), items: this.byDate().get(iso) ?? [] };
  }

  protected readonly monthCells = computed(() => {
    const c = this.cursor();
    const start = startOfWeek(new Date(c.getFullYear(), c.getMonth(), 1));
    return Array.from({ length: 42 }, (_, i) => this.cell(addDays(start, i), c.getMonth()));
  });
  protected readonly weekCells = computed(() => {
    const s = startOfWeek(this.cursor());
    return Array.from({ length: 7 }, (_, i) => this.cell(addDays(s, i), this.cursor().getMonth()));
  });
  protected readonly dayCell = computed(() => this.cell(this.cursor(), this.cursor().getMonth()));

  /** Agenda shown under the month grid (the tapped day). */
  protected readonly selectedItems = computed(() => this.byDate().get(this.selectedIso()) ?? []);

  protected readonly title = computed(() => {
    const c = this.cursor();
    const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-IN', o);
    if (this.view() === 'month') return fmt(c, { month: 'long', year: 'numeric' });
    if (this.view() === 'day') return fmt(c, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const s = startOfWeek(c);
    return `${fmt(s, { day: 'numeric', month: 'short' })} – ${fmt(addDays(s, 6), { day: 'numeric', month: 'short', year: 'numeric' })}`;
  });

  protected step(dir: -1 | 1): void {
    const c = this.cursor();
    const next = this.view() === 'month' ? new Date(c.getFullYear(), c.getMonth() + dir, 1)
      : addDays(c, (this.view() === 'week' ? 7 : 1) * dir);
    this.cursor.set(next);
    this.selectedIso.set(toIsoDate(next));
  }

  protected goToday(): void {
    this.cursor.set(new Date());
    this.selectedIso.set(toIsoDate(new Date()));
  }

  protected openDay(iso: string): void {
    this.cursor.set(parseIsoDate(iso));
    this.selectedIso.set(iso);
    this.view.set('day');
  }

  protected selectDay(iso: string): void {
    this.selectedIso.set(iso);
  }

  protected setView(v: View): void {
    this.view.set(v);
  }
}
