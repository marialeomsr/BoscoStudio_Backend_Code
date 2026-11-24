import { AutoMaxLength } from '../../shared/validators';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { ClientRecord, SaveClientRequest } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { InputFilter } from '../../shared/input-filter';
import { AutoError, email, personName, phone, requiredPhone } from '../../shared/validators';

/** Add (client = null) or edit a client. Closes with the saved record, or undefined if dismissed. */
@Component({
  selector: 'app-client-edit-dialog',
  imports: [AutoMaxLength, ReactiveFormsModule, InputFilter, AutoError, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Edit client' : 'New client' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <div class="grid">
          <mat-form-field appearance="outline" class="full"><mat-label>Full name</mat-label><input matInput formControlName="fullName" />
<mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Phone</mat-label><input matInput type="tel" appInputType="phone" formControlName="phone" />
<mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>WhatsApp</mat-label><input matInput type="tel" appInputType="phone" formControlName="whatsAppNo" /><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline" class="full"><mat-label>Email</mat-label><input matInput type="email" formControlName="email" />
<mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline" class="full"><mat-label>Address</mat-label><textarea matInput rows="2" formControlName="address"></textarea><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline" class="full"><mat-label>Notes</mat-label><textarea matInput rows="2" formControlName="notes"></textarea><mat-error auto></mat-error></mat-form-field>
        </div>
        @if (data && data.orderCount > 0) {
          <p class="note">Changes also show on this client's {{ data.orderCount }} existing order(s), quotations and invoices.</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">Save</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: 1fr; column-gap: 12px; }
    @media (min-width: 520px) { .grid { grid-template-columns: 1fr 1fr; } .full { grid-column: 1 / -1; } }
    .note { margin: 0; font-size: 13px; color: var(--mat-sys-on-surface-variant); }
  `,
})
export class ClientEditDialog {
  protected readonly data = inject<ClientRecord | null>(MAT_DIALOG_DATA);
  private readonly ref = inject<MatDialogRef<ClientEditDialog, ClientRecord>>(MatDialogRef);
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  protected readonly saving = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    fullName: [this.data?.fullName ?? '', [Validators.required, personName, Validators.maxLength(120)]],
    phone: [this.data?.phone ?? '', requiredPhone],
    whatsAppNo: [this.data?.whatsAppNo ?? '', [phone, Validators.maxLength(30)]],
    email: [this.data?.email ?? '', [email, Validators.maxLength(150)]],
    address: [this.data?.address ?? '', Validators.maxLength(300)],
    notes: [this.data?.notes ?? '', Validators.maxLength(500)],
  });

  protected save(): void {
    const v = this.form.getRawValue();
    const nullable = (x: string) => x.trim() || null;
    const body: SaveClientRequest = {
      fullName: v.fullName.trim(), phone: v.phone.trim(), whatsAppNo: nullable(v.whatsAppNo),
      email: nullable(v.email), address: nullable(v.address), notes: nullable(v.notes),
    };
    this.saving.set(true);
    (this.data ? this.api.updateClient(this.data.clientId, body) : this.api.createClient(body)).subscribe({
      next: (c) => this.ref.close(c),
      error: (e) => { this.saving.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  static open(dialog: MatDialog, client: ClientRecord | null): Observable<ClientRecord | undefined> {
    return dialog.open<ClientEditDialog, ClientRecord | null, ClientRecord>(ClientEditDialog, { data: client, width: 'min(94vw, 520px)' }).afterClosed();
  }
}
