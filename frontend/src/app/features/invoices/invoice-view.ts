import { DatePipe } from '@angular/common';
import { Component, inject, input, numberAttribute, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { StudioApi } from '../../core/api/studio-api';
import { DocumentDetail } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { InrPipe } from '../../shared/pipes/inr.pipe';

/** A4-style quotation / invoice. The Print button uses the browser's print dialog (Save as PDF works too). */
@Component({
  selector: 'app-invoice-view',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, InrPipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    @if (doc(); as d) {
      <div class="toolbar no-print">
        <a mat-button routerLink="/invoices"><mat-icon>arrow_back</mat-icon> Back</a>
        <a mat-button [routerLink]="['/orders', d.orderId]">Order {{ d.orderNumber }}</a>
        <button mat-stroked-button (click)="editing() ? editing.set(false) : startEdit(d)"><mat-icon>edit</mat-icon> {{ editing() ? 'Close editor' : 'Edit' }}</button>
        <button mat-flat-button (click)="print()"><mat-icon>print</mat-icon> Print / PDF</button>
      </div>

      @if (editing()) {
        <form class="editor no-print" [formGroup]="form" (ngSubmit)="save(d)">
          <h3>Edit {{ d.documentType.toLowerCase() }} {{ d.documentNumber }}</h3>
          <mat-form-field appearance="outline"><mat-label>{{ d.documentType === 'Quotation' ? 'Valid until' : 'Due date' }}</mat-label>
            <input matInput type="date" formControlName="dueDate" /></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Notes</mat-label><textarea matInput rows="2" formControlName="notes"></textarea></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Terms &amp; conditions</mat-label><textarea matInput rows="6" formControlName="terms"></textarea></mat-form-field>
          <p class="muted">Amounts, discount and tax come from the order — <a [routerLink]="['/orders', d.orderId, 'edit']">edit the order</a> to change them. Studio details are in <a routerLink="/settings">Settings</a>.</p>
          <div class="editor-actions"><button mat-flat-button type="submit" [disabled]="saving()">Save changes</button></div>
        </form>
      }

      <article class="sheet">
        <header class="top">
          <div>
            @if (d.studio.logoUrl) { <img class="logo" [src]="d.studio.logoUrl" alt="" /> }
            <h1>{{ d.studio.studioName }}</h1>
            @if (d.studio.tagline) { <p class="muted">{{ d.studio.tagline }}</p> }
            @if (d.studio.addressLine) { <p>{{ d.studio.addressLine }}</p> }
            <p>{{ d.studio.phone }} @if (d.studio.email) { · {{ d.studio.email }} }</p>
            @if (d.studio.taxRegistrationNo) { <p>GST/VAT: {{ d.studio.taxRegistrationNo }}</p> }
          </div>
          <div class="meta">
            <h2>{{ d.documentType === 'Invoice' ? 'INVOICE' : 'QUOTATION' }}</h2>
            <p><strong>{{ d.documentNumber }}</strong></p>
            <p>Date: {{ d.issueDate | date: 'd MMM yyyy' }}</p>
            @if (d.dueDate) { <p>Due: {{ d.dueDate | date: 'd MMM yyyy' }}</p> }
          </div>
        </header>

        <section class="parties">
          <div>
            <small>Billed to</small>
            <p><strong>{{ d.client.fullName }}</strong></p>
            <p>{{ d.client.phone }}</p>
            @if (d.client.email) { <p>{{ d.client.email }}</p> }
            @if (d.client.address) { <p>{{ d.client.address }}</p> }
          </div>
          <div>
            <small>Event</small>
            <p><strong>{{ d.eventType }}</strong> · {{ d.eventDate | date: 'd MMM yyyy' }}</p>
            @if (d.venue) { <p>{{ d.venue }}</p> }
            <p class="muted">Order {{ d.orderNumber }}</p>
          </div>
        </section>

        <table class="lines">
          <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th></tr></thead>
          <tbody>
            @for (l of d.lines; track $index) {
              <tr><td>{{ l.description }}</td><td class="num">{{ l.quantity }}</td><td class="num">{{ l.unitPrice | inr }}</td><td class="num">{{ l.lineTotal | inr }}</td></tr>
            }
          </tbody>
        </table>

        <dl class="totals">
          <dt>Subtotal</dt><dd>{{ d.subtotal | inr }}</dd>
          @if (d.discountAmount > 0) { <dt>Discount</dt><dd>− {{ d.discountAmount | inr }}</dd> }
          @if (d.taxPercent > 0) { <dt>Tax ({{ d.taxPercent }}%)</dt><dd>{{ d.taxAmount | inr }}</dd> }
          <dt class="strong">Total</dt><dd class="strong">{{ d.total | inr }}</dd>
          @if (d.documentType === 'Invoice') {
            <dt>Paid</dt><dd>{{ d.totalPaid | inr }}</dd>
            <dt class="strong">Balance due</dt><dd class="strong">{{ d.balanceDue | inr }}</dd>
          }
        </dl>

        @if (d.documentType === 'Invoice' && d.payments.length) {
          <section>
            <h3>Payment history</h3>
            <table class="lines">
              <thead><tr><th>Date</th><th>Type</th><th>Mode</th><th>Ref</th><th class="num">Amount</th></tr></thead>
              <tbody>
                @for (p of d.payments; track p.paymentId) {
                  <tr><td>{{ p.paymentDate | date: 'd MMM yyyy' }}</td><td>{{ p.paymentType }}</td><td>{{ p.paymentMode }}</td><td>{{ p.transactionRef || '—' }}</td><td class="num">{{ p.amount | inr }}</td></tr>
                }
              </tbody>
            </table>
          </section>
        }

        @if (d.notes) { <section><h3>Notes</h3><p class="pre">{{ d.notes }}</p></section> }
        @if (d.studio.bankDetails) { <section><h3>Payment details</h3><p class="pre">{{ d.studio.bankDetails }}</p></section> }
        @if (d.terms) { <section class="terms"><h3>Terms &amp; conditions</h3><p class="pre">{{ d.terms }}</p></section> }
      </article>
    } @else if (error()) {
      <p class="error">{{ error() }}</p>
    }
  `,
  styles: `
    :host { display: block; }
    .toolbar { display: flex; gap: 8px; flex-wrap: wrap; justify-content: space-between; max-width: 820px; margin: 0 auto 12px; }
    .sheet { max-width: 820px; margin: 0 auto; background: #fff; color: #111; padding: 24px; border-radius: 8px; box-shadow: 0 1px 6px rgba(0, 0, 0, .15); }
    h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 24px; margin: 0; letter-spacing: 2px; } h3 { font-size: 14px; margin: 18px 0 6px; }
    p { margin: 2px 0; } .muted { color: #666; } .pre { white-space: pre-line; } .error { color: var(--mat-sys-error); }
    .logo { max-height: 56px; margin-bottom: 6px; }
    .editor { max-width: 820px; margin: 0 auto 16px; display: flex; flex-direction: column; background: var(--mat-sys-surface-container-low); border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 16px; h3 { margin: 0 0 12px; font-size: 16px; } }
    .editor .muted { color: var(--mat-sys-on-surface-variant); font-size: 13px; } .editor a { color: var(--mat-sys-primary); }
    .editor-actions { display: flex; justify-content: flex-end; margin-top: 8px; }
    .top { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-bottom: 2px solid #111; padding-bottom: 12px; }
    .meta { text-align: right; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; small { color: #666; text-transform: uppercase; font-size: 11px; } }
    .lines { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .lines th { background: #f3f3f3; text-align: left; } .lines th, .lines td { padding: 8px; border-bottom: 1px solid #ddd; }
    .num { text-align: right !important; }
    .totals { display: grid; grid-template-columns: 1fr auto; margin: 12px 0 0 auto; width: min(100%, 300px); row-gap: 4px; dt, dd { margin: 0; } dd { text-align: right; } }
    .strong { font-weight: 700; border-top: 1px solid #ddd; padding-top: 4px; }
    .terms { font-size: 12px; color: #444; }
    @media (max-width: 599px) { .sheet { padding: 14px; } .parties { grid-template-columns: 1fr; } .meta { text-align: left; } .lines { font-size: 13px; } }
  `,
})
export class InvoiceView {
  private readonly api = inject(StudioApi);
  readonly id = input.required({ transform: numberAttribute });

  private readonly snack = inject(MatSnackBar);
  protected readonly doc = signal<DocumentDetail | null>(null);
  protected readonly error = signal('');
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    dueDate: [''],
    notes: [''],
    terms: [''],
  });

  protected startEdit(d: DocumentDetail): void {
    this.form.setValue({ dueDate: d.dueDate ?? '', notes: d.notes ?? '', terms: d.terms ?? '' });
    this.editing.set(true);
  }

  protected save(d: DocumentDetail): void {
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.updateDocument(d.documentId, { dueDate: v.dueDate || null, notes: v.notes || null, terms: v.terms || null }).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.doc.set(updated);
        this.editing.set(false);
        this.snack.open(`${updated.documentNumber} updated`, 'OK', { duration: 2500 });
      },
      error: (e) => { this.saving.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  ngOnInit(): void {
    this.api.document(this.id()).subscribe({
      next: (d) => this.doc.set(d),
      error: (e) => this.error.set(describeError(e)),
    });
  }

  protected print(): void {
    window.print();
  }
}
