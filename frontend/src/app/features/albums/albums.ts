import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { StudioApi } from '../../core/api/studio-api';
import { ALBUM_STAGES, Album } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { AlbumEditDialog } from '../../shared/components/album-edit-dialog';

const AWAITING_OWNER = ['Photo Selection Pending', 'Sheet Designing', 'Client Proofing', 'Album Received'];

/** All albums across orders. The count tiles double as the stage filter (same tiles as the Home page strip). */
@Component({
  selector: 'app-albums',
  imports: [DatePipe, RouterLink, MatButtonModule, MatIconModule],
  template: `
    <header class="page-head purple">
      <span class="ico"><mat-icon>photo_album</mat-icon></span>
      <h1>Albums <span class="sub">{{ albums().length }} album(s) · {{ actionCount() }} need your action</span></h1>
    </header>

    <div class="tiles" role="group" aria-label="Filter albums">
      <button type="button" class="tile slate" [class.on]="filter() === ''" (click)="filter.set('')">
        <strong>{{ albums().length }}</strong><small>All albums</small>
      </button>
      <button type="button" class="tile amber" [class.on]="filter() === 'action'" [class.zero]="actionCount() === 0" (click)="filter.set('action')">
        <strong>{{ actionCount() }}</strong><small>Needs my action</small>
      </button>
      @for (s of stages; track s) {
        <button type="button" class="tile purple" [class.on]="filter() === s" [class.zero]="count(s) === 0" (click)="filter.set(s)">
          <strong>{{ count(s) }}</strong><small>{{ s }}</small>
        </button>
      }
    </div>

    <div class="cards">
      @for (a of visible(); track a.albumId) {
        <article class="panel purple">
          <header>
            <a [routerLink]="['/orders', a.orderId]"><strong>{{ a.clientName }}</strong></a>
            <span class="stage">{{ a.albumStage }}</span>
          </header>
          <p class="muted">{{ a.orderNumber }} · {{ a.albumType }} · {{ a.sheetCount }} sheets</p>
          @if (a.printVendorName) { <p class="muted">Vendor: {{ a.printVendorName }}@if (a.printVendorContact) { ({{ a.printVendorContact }}) }</p> }
          @else { <p class="muted">No print vendor yet.</p> }
          @if (a.sentToPrintOn) { <p class="muted">Sent to print {{ a.sentToPrintOn | date: 'd MMM' }}</p> }
          @if (a.receivedOn) { <p class="muted">Received {{ a.receivedOn | date: 'd MMM' }}</p> }
          <div class="bar"><span [style.width.%]="progress(a)"></span></div>
          <div class="row">
            @if (a.nextStage; as next) {
              <button mat-flat-button [disabled]="busy()" (click)="advance(a, next)">Mark: {{ next }}</button>
            } @else { <span class="done">✔ Handed over {{ a.handedOverOn | date: 'd MMM yyyy' }}</span> }
            <button mat-button [disabled]="busy()" (click)="edit(a)">Edit details</button>
          </div>
        </article>
      } @empty { <p class="muted">No albums here.</p> }
    </div>
  `,
  styles: `
    :host { display: block; max-width: 1200px; margin: 0 auto; }
    .cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
    .panel { display: flex; flex-direction: column; gap: 3px; padding-top: 12px; }
    .panel > header { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
    a { color: inherit; }
    .stage { font-size: 12px; font-weight: 500; text-align: right; color: color-mix(in srgb, var(--accent) 80%, black); background: color-mix(in srgb, var(--accent) 12%, white); border-radius: 999px; padding: 1px 10px; }
    .muted { color: var(--mat-sys-on-surface-variant); margin: 0; font-size: 13px; }
    .bar { height: 6px; border-radius: 3px; background: color-mix(in srgb, var(--accent) 15%, white); margin: 8px 0; overflow: hidden; span { display: block; height: 100%; background: var(--accent); } }
    .done { color: #2e7d32; }
    .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
  `,
})
export class Albums {
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  /** ?stage=... from the home page's "Albums by stage" strip. */
  readonly stage = input<string>();

  protected readonly stages = ALBUM_STAGES;
  protected readonly albums = signal<Album[]>([]);
  protected readonly filter = signal('');
  protected readonly busy = signal(false);

  protected readonly actionCount = computed(() => this.albums().filter((a) => AWAITING_OWNER.includes(a.albumStage)).length);
  protected readonly visible = computed(() => {
    const f = this.filter();
    if (!f) return this.albums();
    return this.albums().filter((a) => (f === 'action' ? AWAITING_OWNER.includes(a.albumStage) : a.albumStage === f));
  });

  constructor() {
    effect(() => { const s = this.stage(); if (s) this.filter.set(s); });
    this.load();
  }

  protected count(stage: string): number {
    return this.albums().filter((a) => a.albumStage === stage).length;
  }

  protected progress(a: Album): number {
    return Math.round(((ALBUM_STAGES.indexOf(a.albumStage) + 1) / ALBUM_STAGES.length) * 100);
  }

  protected advance(a: Album, stage: string): void {
    // The print lab needs a vendor: ask for it right here instead of failing.
    if (stage === 'Sent to Print Lab' && !a.printVendorName) {
      AlbumEditDialog.open(this.dialog, { album: a, hint: 'Enter the print vendor to send this album to the print lab.' })
        .subscribe((saved) => saved?.printVendorName ? this.move(a, stage) : this.load());
      return;
    }
    this.move(a, stage);
  }

  protected edit(a: Album): void {
    AlbumEditDialog.open(this.dialog, { album: a }).subscribe((saved) => {
      if (saved) { this.snack.open('Album details saved', 'OK', { duration: 2500 }); this.load(); }
    });
  }

  private move(a: Album, stage: string): void {
    this.busy.set(true);
    this.api.changeAlbumStage(a.albumId, stage).subscribe({
      next: () => { this.busy.set(false); this.snack.open(`${a.clientName}: ${stage}`, 'OK', { duration: 2500 }); this.load(); },
      error: (e) => { this.busy.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  private load(): void {
    this.api.albums().subscribe((list) => this.albums.set(list));
  }
}
