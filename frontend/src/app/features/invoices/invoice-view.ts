import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, startWith } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { StudioApi } from '../../core/api/studio-api';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentDetail } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { ratesFromLines, totalTaxPercent } from '../../shared/tax';
import { AutoError, money, percent, quantity as quantity_, sensibleDate } from '../../shared/validators';

type LineGroup = FormGroup<{
  description: FormControl<string>;
  quantity: FormControl<number>;
  unitPrice: FormControl<number>;
}>;

/** A4-style quotation / invoice. The Print button uses the browser's print dialog (Save as PDF works too). */
@Component({
  selector: 'app-invoice-view',
  imports: [DatePipe, ReactiveFormsModule, AutoError, RouterLink, InrPipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  template: `
    @if (doc(); as d) {
      <div class="toolbar no-print">
        <a mat-button routerLink="/invoices"><mat-icon>arrow_back</mat-icon> Back</a>
        <a mat-button [routerLink]="['/orders', d.orderId]">Order {{ d.orderNumber }}</a>
        @if (auth.can('documents.manage')) { <button mat-stroked-button (click)="editing() ? editing.set(false) : startEdit(d)"><mat-icon>edit</mat-icon> {{ editing() ? 'Close editor' : 'Edit' }}</button> }
        <button mat-flat-button (click)="print()"><mat-icon>print</mat-icon> Print / PDF</button>
      </div>

      @if (editing()) {
        <form class="editor no-print" [formGroup]="form" (ngSubmit)="save(d)">
          <h3>Edit {{ d.documentType.toLowerCase() }} {{ d.documentNumber }}</h3>
          <mat-form-field appearance="outline"><mat-label>{{ d.documentType === 'Quotation' ? 'Valid until' : 'Due date' }}</mat-label>
            <input matInput type="date" formControlName="dueDate" /><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Notes</mat-label><textarea matInput rows="2" formControlName="notes"></textarea><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Terms &amp; conditions</mat-label><textarea matInput rows="6" formControlName="terms"></textarea><mat-error auto></mat-error></mat-form-field>

          <h4>Items</h4>
          <div formArrayName="lines">
            @for (line of lines.controls; track $index) {
              <div class="line" [formGroupName]="$index">
                <mat-form-field appearance="outline" class="desc"><mat-label>Description</mat-label><input matInput formControlName="description" /><mat-error auto></mat-error></mat-form-field>
                <mat-form-field appearance="outline" class="qty"><mat-label>Qty</mat-label><input matInput type="number" inputmode="decimal" formControlName="quantity" /><mat-error auto></mat-error></mat-form-field>
                <mat-form-field appearance="outline" class="rate"><mat-label>Rate</mat-label><input matInput type="number" inputmode="decimal" formControlName="unitPrice" /><mat-error auto></mat-error></mat-form-field>
                <span class="amt">{{ lineAmount($index) | inr }}</span>
                <button mat-icon-button type="button" aria-label="Remove item" [disabled]="lines.length === 1" (click)="removeLine($index)"><mat-icon>delete</mat-icon></button>
              </div>
            }
          </div>
          <div class="items-foot">
            <button mat-stroked-button type="button" (click)="addLine()"><mat-icon>add</mat-icon> Add item</button>
          </div>

          <h4>Discount &amp; tax</h4>
          <div class="pricing">
            <mat-form-field appearance="outline"><mat-label>Discount (amount)</mat-label>
              <input matInput type="number" inputmode="decimal" formControlName="discountAmount" /><mat-error auto></mat-error></mat-form-field>
            <mat-form-field appearance="outline" class="split"><mat-label>Show tax as</mat-label>
              <mat-select formControlName="taxSplit" (selectionChange)="onTaxSplitChange()"><mat-option value="Single">One tax line</mat-option><mat-option value="CGST+SGST">CGST + SGST (separate rates)</mat-option></mat-select></mat-form-field>
            @if (form.controls.taxSplit.value === 'CGST+SGST') {
              <mat-form-field appearance="outline"><mat-label>CGST %</mat-label>
                <input matInput type="number" inputmode="decimal" formControlName="cgstPercent" /><mat-error auto></mat-error></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>SGST %</mat-label>
                <input matInput type="number" inputmode="decimal" formControlName="sgstPercent" /><mat-error auto></mat-error></mat-form-field>
            } @else {
              <mat-form-field appearance="outline"><mat-label>Tax % (e.g. GST)</mat-label>
                <input matInput type="number" inputmode="decimal" formControlName="taxPercent" /><mat-error auto></mat-error></mat-form-field>
            }
          </div>
          <dl class="breakdown">
            <dt>Items total</dt><dd>{{ pricing().subtotal | inr }}</dd>
            <dt>Discount</dt><dd>− {{ pricing().discount | inr }}</dd>
            @if (form.controls.taxSplit.value === 'CGST+SGST' && pricing().tax > 0) {
              <dt>CGST ({{ form.controls.cgstPercent.value ?? 0 }}%)</dt><dd>{{ pricing().cgst | inr }}</dd>
              <dt>SGST ({{ form.controls.sgstPercent.value ?? 0 }}%)</dt><dd>{{ pricing().tax - pricing().cgst | inr }}</dd>
            } @else {
              <dt>Tax ({{ pricing().pct }}%)</dt><dd>{{ pricing().tax | inr }}</dd>
            }
            <dt class="strong">Total</dt><dd class="strong">{{ pricing().total | inr }}</dd>
          </dl>
          @if (pricing().discount > pricing().subtotal) { <p class="warn-inline">The discount is higher than the items total.</p> }
          <p class="muted">Items, discount and tax are saved on the order, so the quotation, the invoice and the order always show the same
            total and balance. Studio details are in <a routerLink="/settings">Settings</a>.</p>
          <div class="editor-actions"><button mat-flat-button type="submit" [disabled]="form.invalid || saving()">Save changes</button></div>
        </form>
      }

      @if (itemsMismatch(d)) {
        <p class="warn no-print">
          The items add up to {{ linesTotalOf(d) | inr }} but the order amount is {{ d.subtotal | inr }}.
          Open <strong>Edit</strong> and save the items to bring them in line before printing.
        </p>
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
          @for (t of d.taxLines; track t.label) { <dt>{{ t.label }} ({{ t.percent }}%)</dt><dd>{{ t.amount | inr }}</dd> }
          <dt class="strong">{{ d.albumsTotal > 0 ? 'Photoshoot total' : 'Total' }}</dt><dd class="strong">{{ d.total | inr }}</dd>
          @if (d.albumsTotal > 0) {
            @for (a of d.albumLines; track $index) { <dt>{{ a.description }}</dt><dd>{{ a.lineTotal | inr }}</dd> }
            <dt class="strong">Grand total</dt><dd class="strong">{{ d.grandTotal | inr }}</dd>
          }
          @if (d.documentType === 'Invoice' || d.payments.length) {
            <dt>Paid</dt><dd>{{ d.totalPaid | inr }}</dd>
            <dt class="strong">Balance due</dt><dd class="strong">{{ d.balanceDue | inr }}</dd>
          }
        </dl>

        @if (paymentRows().length) {
          <!-- Visible on screen only: left out of the printed / PDF copy. -->
          <section class="no-print">
            <h3>Payment history</h3>
            <table class="lines">
              <thead><tr><th>Date</th><th>Type</th><th>Mode</th><th>Ref</th><th class="num">Paid</th><th class="num">Balance after</th></tr></thead>
              <tbody>
                @for (p of paymentRows(); track p.paymentId) {
                  <tr><td>{{ p.paymentDate | date: 'd MMM yyyy' }}</td><td>{{ p.paymentType }}</td><td>{{ p.paymentMode }}</td><td>{{ p.transactionRef || '—' }}</td><td class="num">{{ p.amount | inr }}</td><td class="num">{{ p.balanceAfter | inr }}</td></tr>
                }
              </tbody>
              <tfoot><tr><td colspan="4"><strong>Total paid</strong></td><td class="num"><strong>{{ d.totalPaid | inr }}</strong></td><td class="num"><strong>{{ d.balanceDue | inr }}</strong></td></tr></tfoot>
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
    .editor h4 { margin: 8px 0; font-size: 14px; }
    .line { display: grid; grid-template-columns: 1fr 1fr auto; column-gap: 8px; align-items: start; }
    .line .desc { grid-column: 1 / -1; }
    .line .amt { align-self: center; justify-self: end; padding-bottom: 20px; font-variant-numeric: tabular-nums; }
    .line button { align-self: start; margin-top: 6px; }
    @media (min-width: 720px) {
      .line { grid-template-columns: 3fr 90px 130px 110px auto; }
      .line .desc { grid-column: auto; }
    }
    .pricing { display: grid; grid-template-columns: 1fr 1fr; column-gap: 8px; } .pricing .split { grid-column: 1 / -1; }
    .breakdown { display: grid; grid-template-columns: 1fr auto; row-gap: 3px; margin: 0 0 8px auto; width: min(100%, 280px); dt, dd { margin: 0; } dd { text-align: right; font-variant-numeric: tabular-nums; } }
    .breakdown .strong { font-weight: 700; border-top: 1px solid var(--mat-sys-outline-variant); padding-top: 3px; }
    .warn-inline { margin: 0 0 8px; color: var(--mat-sys-error); font-size: 13px; }
    .items-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin: 4px 0 8px; }
    .warn { max-width: 820px; margin: 0 auto 12px; padding: 10px 14px; border-radius: 10px; background: #fff3e0; color: #e65100; }
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
  protected readonly auth = inject(AuthService);
  private readonly api = inject(StudioApi);
  readonly id = input.required({ transform: numberAttribute });

  private readonly snack = inject(MatSnackBar);
  protected readonly doc = signal<DocumentDetail | null>(null);
  /** The order's payments in date order, each with what was still owed right after it (grand total − paid so far). */
  protected readonly paymentRows = computed(() => {
    const d = this.doc();
    let paid = 0;
    return (d?.payments ?? []).map((p) => ({ ...p, balanceAfter: d!.grandTotal - (paid += p.amount) }));
  });
  protected readonly error = signal('');
  protected readonly editing = signal(false);
  protected readonly saving = signal(false);

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    dueDate: ['', sensibleDate],
    notes: ['', Validators.maxLength(500)],
    terms: ['', Validators.maxLength(4000)],
    discountAmount: [0, money],
    taxPercent: [0, percent],
    taxSplit: this.fb.control<'Single' | 'CGST+SGST'>('Single'),
    cgstPercent: this.fb.control<number | null>(0, percent),
    sgstPercent: this.fb.control<number | null>(0, percent),
    lines: this.fb.array<LineGroup>([]),
  });
  get lines(): FormArray<LineGroup> { return this.form.controls.lines; }

  /** Live figures of what is being edited (mirrors the SQL computed columns on the order). */
  protected readonly pricing = toSignal(
    this.form.valueChanges.pipe(map(() => this.calcPricing()), startWith(this.calcPricing())),
    { initialValue: { subtotal: 0, discount: 0, pct: 0, tax: 0, cgst: 0, total: 0 } },
  );

  private calcPricing() {
    const subtotal = this.sumLines();
    const discount = this.form.controls.discountAmount.value || 0;
    const pct = totalTaxPercent(this.form.getRawValue());
    const net = Math.max(0, subtotal - discount);
    const tax = Math.round(net * pct) / 100;
    const cgst = Math.round(net * (this.form.controls.cgstPercent.value || 0)) / 100;
    return { subtotal, discount, pct, tax, cgst, total: net + tax };
  }

  /** Switching the display: start the two rates from the current one (half each), or add them back into one rate. */
  protected onTaxSplitChange(): void {
    const c = this.form.controls;
    if (c.taxSplit.value === 'CGST+SGST') {
      const half = Math.round((c.taxPercent.value ?? 0) * 50) / 100;
      c.cgstPercent.setValue(half);
      c.sgstPercent.setValue(half);
    } else {
      c.taxPercent.setValue((c.cgstPercent.value ?? 0) + (c.sgstPercent.value ?? 0));
    }
  }

  protected lineAmount(i: number): number {
    const v = this.lines.at(i).getRawValue();
    return Math.round((v.quantity || 0) * (v.unitPrice || 0) * 100) / 100;
  }

  private sumLines(): number {
    return this.lines.controls.reduce((s, _, i) => s + this.lineAmount(i), 0);
  }

  protected addLine(description = '', quantity = 1, unitPrice = 0): void {
    this.lines.push(this.fb.group({
      description: [description, [Validators.required, Validators.maxLength(300)]],
      quantity: [quantity, [Validators.required, quantity_]],
      unitPrice: [unitPrice, [Validators.required, money]],
    }));
  }

  protected removeLine(i: number): void {
    if (this.lines.length > 1) this.lines.removeAt(i);
  }

  protected linesTotalOf(d: DocumentDetail): number {
    return d.lines.reduce((s, l) => s + l.lineTotal, 0);
  }

  /** Items no longer add up to the order amount (the order price changed after multi-item editing). */
  protected itemsMismatch(d: DocumentDetail): boolean {
    return Math.abs(this.linesTotalOf(d) - d.subtotal) > 0.005;
  }

  protected startEdit(d: DocumentDetail): void {
    this.form.patchValue({
      dueDate: d.dueDate ?? '', notes: d.notes ?? '', terms: d.terms ?? '',
      discountAmount: d.discountAmount, taxPercent: d.taxPercent, taxSplit: d.taxSplit,
      ...ratesFromLines(d.taxLines, d.taxPercent),
    });
    this.lines.clear();
    d.lines.forEach((l) => this.addLine(l.description, l.quantity, l.unitPrice));
    this.editing.set(true);
  }

  protected save(d: DocumentDetail): void {
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.updateDocument(d.documentId, {
      dueDate: v.dueDate || null, notes: v.notes || null, terms: v.terms || null,
      discountAmount: v.discountAmount || 0, taxPercent: totalTaxPercent(v), taxSplit: v.taxSplit,
      cgstPercent: v.taxSplit === 'CGST+SGST' ? v.cgstPercent : null,
      lines: v.lines.map((l) => ({ description: l.description.trim(), quantity: l.quantity, unitPrice: l.unitPrice })),
    }).subscribe({
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
