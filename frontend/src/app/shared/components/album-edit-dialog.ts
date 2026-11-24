import { AutoMaxLength } from '../validators';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { Album } from '../../core/models/studio.models';
import { describeError } from '../api-error';
import { AutoError, intRange, money, phoneOrEmail } from '../validators';

export interface AlbumEditData {
  album: Album;
  /** Shown above the form, e.g. why the owner was sent here. */
  hint?: string;
  /** The order's package already includes the Album part: its price is in the order total, so no separate price is asked. */
  priceIncluded?: boolean;
}

/** Edit album type, sheets and print vendor details at any stage. Closes with the updated Album, or undefined if dismissed. */
@Component({
  selector: 'app-album-edit-dialog',
  imports: [AutoMaxLength, ReactiveFormsModule, AutoError, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Edit album</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        @if (data.hint) { <p class="hint">{{ data.hint }}</p> }
        <div class="grid">
          <mat-form-field appearance="outline" class="full"><mat-label>Album type</mat-label><input matInput formControlName="albumType" /><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Sheets</mat-label><input matInput type="number" inputmode="numeric" formControlName="sheetCount" /><mat-error auto></mat-error></mat-form-field>
          @if (!data.priceIncluded) {
            <mat-form-field appearance="outline"><mat-label>Selling price (client pays)</mat-label><input matInput type="number" inputmode="decimal" formControlName="sellingPrice" /><mat-error auto></mat-error></mat-form-field>
          }
          <mat-form-field appearance="outline"><mat-label>Print cost (vendor)</mat-label><input matInput type="number" inputmode="decimal" formControlName="printCost" /><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Print vendor</mat-label><input matInput formControlName="printVendorName" /><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Vendor contact</mat-label><input matInput formControlName="printVendorContact" /><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline" class="full"><mat-label>Notes</mat-label><textarea matInput rows="2" formControlName="notes"></textarea><mat-error auto></mat-error></mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">Save</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .hint { margin: 0 0 12px; padding: 8px 12px; border-radius: 8px; background: color-mix(in srgb, var(--mat-sys-primary) 10%, transparent); }
    .grid { display: grid; grid-template-columns: 1fr; column-gap: 12px; }
    @media (min-width: 520px) { .grid { grid-template-columns: 1fr 1fr; } .full { grid-column: 1 / -1; } }
  `,
})
export class AlbumEditDialog {
  protected readonly data = inject<AlbumEditData>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<AlbumEditDialog, Album>>(MatDialogRef);
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  protected readonly saving = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    albumType: [this.data.album.albumType, [Validators.required, Validators.maxLength(60)]],
    sheetCount: [this.data.album.sheetCount, [Validators.required, intRange(1, 500)]],
    sellingPrice: [this.data.album.sellingPrice as number | null, money],
    printCost: [this.data.album.printCost as number | null, money],
    printVendorName: [this.data.album.printVendorName ?? '', Validators.maxLength(120)],
    printVendorContact: [this.data.album.printVendorContact ?? '', [phoneOrEmail, Validators.maxLength(60)]],
    notes: [this.data.album.notes ?? '', Validators.maxLength(500)],
  });

  protected save(): void {
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.updateAlbum(this.data.album.albumId, {
      albumType: v.albumType, sheetCount: v.sheetCount, printCost: v.printCost,
      sellingPrice: this.data.priceIncluded ? 0 : v.sellingPrice ?? 0, packageId: this.data.album.packageId,
      printVendorName: v.printVendorName.trim() || null, printVendorContact: v.printVendorContact.trim() || null,
      notes: v.notes.trim() || null,
    }).subscribe({
      next: (album) => this.ref.close(album),
      error: (e) => { this.saving.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  /** Opens the dialog; emits the saved album, or nothing if the owner cancelled. */
  static open(dialog: MatDialog, data: AlbumEditData): Observable<Album | undefined> {
    return dialog.open<AlbumEditDialog, AlbumEditData, Album>(AlbumEditDialog, { data, width: 'min(94vw, 520px)' }).afterClosed();
  }
}
