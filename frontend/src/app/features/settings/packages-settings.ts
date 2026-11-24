import { AutoMaxLength } from '../../shared/validators';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, startWith } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { EventTypeInfo, PackageInfo, SavePackageRequest } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { AutoError, money } from '../../shared/validators';

/**
 * Packages: a bundle of Photo, Video and/or Album, each part with its own price (all five usual combinations
 * are just different ticks). The order form lets the owner untick parts per order.
 */
@Component({
  selector: 'app-packages-settings',
  imports: [AutoMaxLength, ReactiveFormsModule, AutoError, InrPipe, MatButtonModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
  template: `
    <div class="head">
      <mat-form-field appearance="outline" subscriptSizing="dynamic" class="filter">
        <mat-label>Show event type</mat-label>
        <mat-select [value]="filter()" (selectionChange)="filter.set($event.value)">
          <mat-option value="">All</mat-option>
          @for (t of eventTypes(); track t.eventTypeId) { <mat-option [value]="t.eventTypeName">{{ t.eventTypeName }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <button mat-flat-button (click)="startNew()"><mat-icon>add</mat-icon> Package</button>
    </div>

    @if (editingId() !== null) {
      <form class="editor" [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline"><mat-label>Event type</mat-label>
          <mat-select formControlName="eventType">
            <mat-option value="">Any event</mat-option>
            @for (t of eventTypes(); track t.eventTypeId) { <mat-option [value]="t.eventTypeName">{{ t.eventTypeName }}</mat-option> }
          </mat-select>
        <mat-error auto></mat-error></mat-form-field>
        <mat-form-field appearance="outline" class="span2"><mat-label>Package name</mat-label><input matInput formControlName="packageName" maxlength="120" /><mat-error auto></mat-error></mat-form-field>

        <div class="parts full">
          <p class="parts-title">What is in this package, and the price of each part</p>
          <div class="part">
            <mat-checkbox formControlName="hasPhoto"><mat-icon>photo_camera</mat-icon> Photo</mat-checkbox>
            <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Photo price</mat-label>
              <input matInput type="number" inputmode="decimal" formControlName="photoPrice" /><mat-error auto></mat-error></mat-form-field>
          </div>
          <div class="part">
            <mat-checkbox formControlName="hasVideo"><mat-icon>videocam</mat-icon> Video</mat-checkbox>
            <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Video price</mat-label>
              <input matInput type="number" inputmode="decimal" formControlName="videoPrice" /><mat-error auto></mat-error></mat-form-field>
          </div>
          <div class="part">
            <mat-checkbox formControlName="hasAlbum"><mat-icon>photo_album</mat-icon> Album</mat-checkbox>
            <mat-form-field appearance="outline" subscriptSizing="dynamic"><mat-label>Album price</mat-label>
              <input matInput type="number" inputmode="decimal" formControlName="albumPrice" /><mat-error auto></mat-error></mat-form-field>
          </div>
          <p class="total">Package total: <strong>{{ formTotal() | inr }}</strong>
            @if (!anyPart()) { <span class="warn"> · tick at least one part</span> }</p>
        </div>

        <mat-form-field appearance="outline" class="full"><mat-label>Other details included (e.g. 2 photographers, 300 edited photos)</mat-label><textarea matInput rows="2" formControlName="inclusions"></textarea><mat-error auto></mat-error></mat-form-field>
        <mat-slide-toggle formControlName="isActive">Active (shown in the order form)</mat-slide-toggle>
        <div class="row-actions full">
          <button mat-button type="button" (click)="editingId.set(null)">Cancel</button>
          <button mat-flat-button type="submit" [disabled]="form.invalid || !anyPart() || busy()">{{ editingId() === 0 ? 'Add package' : 'Save' }}</button>
        </div>
      </form>
    }

    <ul class="list">
      @for (p of visible(); track p.packageId) {
        <li [class.inactive]="!p.isActive">
          <div>
            <strong>{{ p.packageName }}</strong>
            <span class="tag">{{ p.eventType || 'Any event' }}</span>
            @if (!p.isActive) { <span class="tag">inactive</span> }
            <div class="parts-line">
              @if (p.photoPrice !== null) { <span class="chip"><mat-icon>photo_camera</mat-icon>Photo {{ p.photoPrice | inr }}</span> }
              @if (p.videoPrice !== null) { <span class="chip"><mat-icon>videocam</mat-icon>Video {{ p.videoPrice | inr }}</span> }
              @if (p.albumPrice !== null) { <span class="chip"><mat-icon>photo_album</mat-icon>Album {{ p.albumPrice | inr }}</span> }
              <strong class="sum">= {{ p.basePrice | inr }}</strong>
            </div>
            @if (p.inclusions) { <div class="muted">{{ p.inclusions }}</div> }
          </div>
          <div class="row-actions">
            <button mat-icon-button aria-label="Edit" (click)="edit(p)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button aria-label="Delete" (click)="remove(p)"><mat-icon>delete</mat-icon></button>
          </div>
        </li>
      } @empty { <li class="muted">No packages{{ filter() ? ' for ' + filter() : '' }} yet.</li> }
    </ul>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .filter { flex: 1 1 220px; max-width: 320px; }
    .muted { color: var(--mat-sys-on-surface-variant); margin: 2px 0 0; font-size: 13px; }
    .editor { display: grid; grid-template-columns: 1fr; gap: 0 12px; margin: 12px 0; padding: 12px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; background: var(--mat-sys-surface-container-low); }
    @media (min-width: 600px) { .editor { grid-template-columns: 1fr 1fr 1fr; } .editor .full { grid-column: 1 / -1; } .editor .span2 { grid-column: span 2; } }
    .parts { margin-bottom: 8px; }
    .parts-title { margin: 0 0 8px; font-weight: 500; }
    .part { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 8px; }
    .part mat-checkbox { flex: 0 0 130px; } .part mat-icon { vertical-align: middle; margin-right: 4px; }
    .part mat-form-field { flex: 1 1 180px; max-width: 260px; }
    .total { margin: 4px 0 0; } .warn { color: var(--mat-sys-error); }
    .list { list-style: none; padding: 0; margin: 12px 0 0; }
    .list li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 4px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .inactive strong { opacity: .6; } .tag { font-size: 11px; background: var(--mat-sys-surface-variant); border-radius: 999px; padding: 1px 8px; margin-left: 6px; }
    .parts-line { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-top: 4px; }
    .chip { display: inline-flex; align-items: center; gap: 2px; font-size: 12px; background: #e3f2fd; color: #0d47a1; border-radius: 999px; padding: 1px 10px 1px 6px; }
    .chip mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .sum { margin-left: 4px; }
    .row-actions { display: flex; gap: 4px; margin-left: auto; }
  `,
})
export class PackagesSettings {
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly packages = signal<PackageInfo[]>([]);
  protected readonly eventTypes = signal<EventTypeInfo[]>([]);
  protected readonly filter = signal('');
  protected readonly editingId = signal<number | null>(null);   // null = closed, 0 = adding
  protected readonly busy = signal(false);

  protected readonly visible = computed(() => this.packages().filter((p) => !this.filter() || p.eventType === this.filter()));

  protected readonly form = inject(NonNullableFormBuilder).group({
    eventType: [''],
    packageName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    hasPhoto: [true], photoPrice: [null as number | null, [Validators.required, money]],
    hasVideo: [false], videoPrice: [{ value: null as number | null, disabled: true }, [Validators.required, money]],
    hasAlbum: [false], albumPrice: [{ value: null as number | null, disabled: true }, [Validators.required, money]],
    inclusions: ['', Validators.maxLength(1000)],
    isActive: [true],
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(null)));
  protected readonly anyPart = computed(() => { this.formValue(); const v = this.form.getRawValue(); return v.hasPhoto || v.hasVideo || v.hasAlbum; });
  protected readonly formTotal = computed(() => {
    this.formValue();
    const v = this.form.getRawValue();
    return (v.hasPhoto ? v.photoPrice ?? 0 : 0) + (v.hasVideo ? v.videoPrice ?? 0 : 0) + (v.hasAlbum ? v.albumPrice ?? 0 : 0);
  });

  constructor() {
    this.api.eventTypes().subscribe((t) => this.eventTypes.set(t));
    // A part's price is only editable (and required) while its box is ticked.
    const c = this.form.controls;
    c.hasPhoto.valueChanges.subscribe((on) => this.toggle(c.photoPrice, on));
    c.hasVideo.valueChanges.subscribe((on) => this.toggle(c.videoPrice, on));
    c.hasAlbum.valueChanges.subscribe((on) => this.toggle(c.albumPrice, on));
    this.load();
  }

  private toggle(price: { enable(): void; disable(): void }, on: boolean): void {
    if (on) price.enable(); else price.disable();
  }

  protected startNew(): void {
    this.setForm({ eventType: this.filter(), packageName: '', photoPrice: 0, videoPrice: null, albumPrice: null, inclusions: '', isActive: true });
    this.editingId.set(0);
  }

  protected edit(p: PackageInfo): void {
    this.setForm({
      eventType: p.eventType ?? '', packageName: p.packageName, photoPrice: p.photoPrice, videoPrice: p.videoPrice,
      albumPrice: p.albumPrice, inclusions: p.inclusions ?? '', isActive: p.isActive,
    });
    this.editingId.set(p.packageId);
  }

  private setForm(v: { eventType: string; packageName: string; photoPrice: number | null; videoPrice: number | null; albumPrice: number | null; inclusions: string; isActive: boolean }): void {
    this.form.reset({
      eventType: v.eventType, packageName: v.packageName, inclusions: v.inclusions, isActive: v.isActive,
      hasPhoto: v.photoPrice !== null, photoPrice: v.photoPrice,
      hasVideo: v.videoPrice !== null, videoPrice: v.videoPrice,
      hasAlbum: v.albumPrice !== null, albumPrice: v.albumPrice,
    });
    const c = this.form.controls;
    this.toggle(c.photoPrice, c.hasPhoto.value);
    this.toggle(c.videoPrice, c.hasVideo.value);
    this.toggle(c.albumPrice, c.hasAlbum.value);
  }

  protected save(): void {
    const id = this.editingId()!;
    const v = this.form.getRawValue();
    const body: SavePackageRequest = {
      eventType: v.eventType || null, packageName: v.packageName,
      photoPrice: v.hasPhoto ? v.photoPrice ?? 0 : null,
      videoPrice: v.hasVideo ? v.videoPrice ?? 0 : null,
      albumPrice: v.hasAlbum ? v.albumPrice ?? 0 : null,
      inclusions: v.inclusions.trim() || null, isActive: v.isActive,
    };
    this.call(id === 0 ? this.api.createPackage(body) : this.api.updatePackage(id, body), id === 0 ? 'Package added' : 'Package saved');
  }

  protected remove(p: PackageInfo): void {
    ConfirmDialog.ask(this.dialog, {
      title: `Delete "${p.packageName}"?`,
      message: 'If orders already use it, deleting is blocked — turn Active off instead.',
      confirmText: 'Delete',
    }).subscribe((yes) => yes && this.call(this.api.deletePackage(p.packageId), 'Package deleted'));
  }

  private call(request: Observable<unknown>, success: string): void {
    this.busy.set(true);
    request.subscribe({
      next: () => { this.busy.set(false); this.editingId.set(null); this.snack.open(success, 'OK', { duration: 2500 }); this.load(); },
      error: (e) => { this.busy.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  private load(): void {
    this.api.packages(true).subscribe((p) => this.packages.set(p));
  }
}
