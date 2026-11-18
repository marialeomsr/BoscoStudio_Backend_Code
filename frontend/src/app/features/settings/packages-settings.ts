import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { EventTypeInfo, PackageInfo, SavePackageRequest } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { ConfirmDialog } from '../../shared/components/confirm-dialog';
import { InrPipe } from '../../shared/pipes/inr.pipe';

/** Packages per event type. The order form lists only the packages of the chosen event type. */
@Component({
  selector: 'app-packages-settings',
  imports: [ReactiveFormsModule, InrPipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatSlideToggleModule],
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
        </mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Package name</mat-label><input matInput formControlName="packageName" maxlength="120" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Price</mat-label><input matInput type="number" inputmode="decimal" formControlName="basePrice" /></mat-form-field>
        <mat-form-field appearance="outline" class="full"><mat-label>What's included</mat-label><textarea matInput rows="2" formControlName="inclusions"></textarea></mat-form-field>
        <mat-slide-toggle formControlName="isActive">Active (shown in the order form)</mat-slide-toggle>
        <div class="row-actions full">
          <button mat-button type="button" (click)="editingId.set(null)">Cancel</button>
          <button mat-flat-button type="submit" [disabled]="form.invalid || busy()">{{ editingId() === 0 ? 'Add package' : 'Save' }}</button>
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
            <div class="muted">{{ p.basePrice | inr }}@if (p.inclusions) { · {{ p.inclusions }} }</div>
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
    @media (min-width: 600px) { .editor { grid-template-columns: 1fr 1fr 1fr; } .editor .full { grid-column: 1 / -1; } }
    .list { list-style: none; padding: 0; margin: 12px 0 0; }
    .list li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 4px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .inactive strong { opacity: .6; } .tag { font-size: 11px; background: var(--mat-sys-surface-variant); border-radius: 999px; padding: 1px 8px; margin-left: 6px; }
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
    packageName: ['', [Validators.required, Validators.maxLength(120)]],
    basePrice: [0, [Validators.required, Validators.min(0)]],
    inclusions: [''],
    isActive: [true],
  });

  constructor() {
    this.api.eventTypes().subscribe((t) => this.eventTypes.set(t));
    this.load();
  }

  protected startNew(): void {
    this.form.reset({ eventType: this.filter(), packageName: '', basePrice: 0, inclusions: '', isActive: true });
    this.editingId.set(0);
  }

  protected edit(p: PackageInfo): void {
    this.form.setValue({ eventType: p.eventType ?? '', packageName: p.packageName, basePrice: p.basePrice, inclusions: p.inclusions ?? '', isActive: p.isActive });
    this.editingId.set(p.packageId);
  }

  protected save(): void {
    const id = this.editingId()!;
    const v = this.form.getRawValue();
    const body: SavePackageRequest = {
      eventType: v.eventType || null, packageName: v.packageName, basePrice: v.basePrice, inclusions: v.inclusions.trim() || null, isActive: v.isActive,
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
