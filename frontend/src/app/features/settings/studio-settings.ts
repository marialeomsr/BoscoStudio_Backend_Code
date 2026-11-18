import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { StudioApi } from '../../core/api/studio-api';
import { StudioSettings } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';

/** The details printed in the header and footer of every quotation and invoice. */
@Component({
  selector: 'app-studio-settings-form',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="save()">
      <p class="intro">These details appear on every quotation and invoice. Changes apply to documents immediately, including ones already issued.</p>

      <div class="grid">
        <mat-form-field appearance="outline" class="full"><mat-label>Studio / company name</mat-label><input matInput formControlName="studioName" />
          @if (form.controls.studioName.invalid) { <mat-error>Required</mat-error> }</mat-form-field>
        <mat-form-field appearance="outline" class="full"><mat-label>Tagline</mat-label><input matInput formControlName="tagline" /></mat-form-field>
        <mat-form-field appearance="outline" class="full"><mat-label>Address</mat-label><textarea matInput rows="2" formControlName="addressLine"></textarea></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Phone</mat-label><input matInput type="tel" formControlName="phone" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" formControlName="email" />
          @if (form.controls.email.invalid) { <mat-error>Enter a valid email</mat-error> }</mat-form-field>
        <mat-form-field appearance="outline"><mat-label>GST / VAT number</mat-label><input matInput formControlName="taxRegistrationNo" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Default tax %</mat-label><input matInput type="number" inputmode="decimal" formControlName="defaultTaxPercent" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Invoice prefix</mat-label><input matInput formControlName="invoicePrefix" maxlength="10" />
          <mat-hint>e.g. INV → INV-2026-001</mat-hint>
          @if (form.controls.invoicePrefix.invalid) { <mat-error>2-10 letters</mat-error> }</mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Quotation prefix</mat-label><input matInput formControlName="quotationPrefix" maxlength="10" />
          <mat-hint>e.g. QTN → QTN-2026-001</mat-hint>
          @if (form.controls.quotationPrefix.invalid) { <mat-error>2-10 letters</mat-error> }</mat-form-field>
        <mat-form-field appearance="outline" class="full"><mat-label>Logo URL (optional)</mat-label><input matInput type="url" formControlName="logoUrl" placeholder="https://" /></mat-form-field>
        <mat-form-field appearance="outline" class="full"><mat-label>Bank / UPI payment details</mat-label><textarea matInput rows="3" formControlName="bankDetails"></textarea></mat-form-field>
        <mat-form-field appearance="outline" class="full"><mat-label>Default terms &amp; conditions</mat-label><textarea matInput rows="6" formControlName="defaultTerms"></textarea>
          <mat-hint>Copied into each new quotation / invoice (editable per document).</mat-hint></mat-form-field>
      </div>

      <div class="actions"><button mat-flat-button type="submit" [disabled]="form.invalid || saving()">Save studio details</button></div>
    </form>
  `,
  styles: `
    .intro { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    .grid { display: grid; grid-template-columns: 1fr; column-gap: 12px; }
    @media (min-width: 600px) { .grid { grid-template-columns: 1fr 1fr; } .full { grid-column: 1 / -1; } }
    .actions { display: flex; justify-content: flex-end; padding-top: 8px; }
  `,
})
export class StudioSettingsForm {
  private readonly api = inject(StudioApi);
  private readonly snack = inject(MatSnackBar);
  protected readonly saving = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    studioName: ['', Validators.required],
    tagline: [''],
    addressLine: [''],
    phone: [''],
    email: ['', Validators.email],
    taxRegistrationNo: [''],
    defaultTaxPercent: [0, [Validators.min(0), Validators.max(100)]],
    invoicePrefix: ['INV', Validators.pattern(/^[A-Za-z]{2,10}$/)],
    quotationPrefix: ['QTN', Validators.pattern(/^[A-Za-z]{2,10}$/)],
    logoUrl: [''],
    bankDetails: [''],
    defaultTerms: [''],
  });

  constructor() {
    this.api.studio().subscribe({
      next: (s) => this.form.setValue({
        studioName: s.studioName, tagline: s.tagline ?? '', addressLine: s.addressLine ?? '', phone: s.phone ?? '',
        email: s.email ?? '', taxRegistrationNo: s.taxRegistrationNo ?? '', defaultTaxPercent: s.defaultTaxPercent,
        invoicePrefix: s.invoicePrefix, quotationPrefix: s.quotationPrefix, logoUrl: s.logoUrl ?? '',
        bankDetails: s.bankDetails ?? '', defaultTerms: s.defaultTerms ?? '',
      }),
      error: (e) => this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }),
    });
  }

  protected save(): void {
    const v = this.form.getRawValue();
    const nullable = (x: string) => x.trim() || null;
    const body: StudioSettings = {
      studioName: v.studioName, tagline: nullable(v.tagline), addressLine: nullable(v.addressLine), phone: nullable(v.phone),
      email: nullable(v.email), taxRegistrationNo: nullable(v.taxRegistrationNo), defaultTaxPercent: v.defaultTaxPercent,
      invoicePrefix: v.invoicePrefix, quotationPrefix: v.quotationPrefix, logoUrl: nullable(v.logoUrl),
      bankDetails: nullable(v.bankDetails), defaultTerms: nullable(v.defaultTerms),
    };
    this.saving.set(true);
    this.api.updateStudio(body).subscribe({
      next: () => { this.saving.set(false); this.snack.open('Studio details saved', 'OK', { duration: 2500 }); },
      error: (e) => { this.saving.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }
}
