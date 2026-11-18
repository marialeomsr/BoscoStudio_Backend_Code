import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { StudioApi } from '../../core/api/studio-api';
import { OrderSummary, PAYMENT_MODES, PAYMENT_TYPES, PaymentMode, PaymentType } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { today } from '../../shared/date-utils';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { AutoError, notFuture, positiveMoney, transactionRef } from '../../shared/validators';

/** Quick "record a payment" from anywhere: pick an order that still owes money, enter the amount, save. */
@Component({
  selector: 'app-record-payment-dialog',
  imports: [ReactiveFormsModule, AutoError, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, InrPipe],
  template: `
    <h2 mat-dialog-title>Record payment</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        <mat-form-field appearance="outline" class="full">
          <mat-label>Order</mat-label>
          <mat-select formControlName="orderId" (selectionChange)="onOrder($event.value)">
            @for (o of orders(); track o.orderId) {
              <mat-option [value]="o.orderId">{{ o.orderNumber }} · {{ o.clientName }} · due {{ o.balanceDue | inr }}</mat-option>
            }
          </mat-select>
          @if (loaded() && !orders().length) { <mat-hint>No orders with a balance due.</mat-hint> }
        <mat-error auto></mat-error></mat-form-field>

        <div class="grid">
          <mat-form-field appearance="outline"><mat-label>Type</mat-label>
            <mat-select formControlName="paymentType">@for (t of types; track t) { <mat-option [value]="t">{{ t }}</mat-option> }</mat-select><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Mode</mat-label>
            <mat-select formControlName="paymentMode">@for (m of modes; track m) { <mat-option [value]="m">{{ m }}</mat-option> }</mat-select><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Amount</mat-label>
            <input matInput type="number" inputmode="decimal" formControlName="amount" />
            @if (selected(); as s) { <mat-hint>Balance due {{ s.balanceDue | inr }}</mat-hint> }<mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Date</mat-label><input matInput type="date" formControlName="paymentDate" /><mat-error auto></mat-error></mat-form-field>
          <mat-form-field appearance="outline" class="full"><mat-label>Transaction ref (optional)</mat-label><input matInput formControlName="transactionRef" /><mat-error auto></mat-error></mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancel</button>
        <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">Save payment</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .full { width: 100%; }
    .grid { display: grid; grid-template-columns: 1fr; column-gap: 12px; }
    @media (min-width: 520px) { .grid { grid-template-columns: 1fr 1fr; } .grid .full { grid-column: 1 / -1; } }
  `,
})
export class RecordPaymentDialog {
  private readonly api = inject(StudioApi);
  private readonly ref = inject<MatDialogRef<RecordPaymentDialog, boolean>>(MatDialogRef);
  private readonly snack = inject(MatSnackBar);

  protected readonly types = PAYMENT_TYPES;
  protected readonly modes = PAYMENT_MODES;
  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly loaded = signal(false);
  protected readonly saving = signal(false);

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    orderId: this.fb.control<number | null>(null, Validators.required),
    paymentType: this.fb.control<PaymentType>('Booking Advance'),
    paymentMode: this.fb.control<PaymentMode>('UPI'),
    amount: this.fb.control<number | null>(null, [Validators.required, positiveMoney]),
    paymentDate: this.fb.control(today(), notFuture),
    transactionRef: this.fb.control('', [transactionRef, Validators.maxLength(100)]),
  });
  private readonly selectedId = signal<number | null>(null);
  protected readonly selected = computed(() => this.orders().find((o) => o.orderId === this.selectedId()) ?? null);

  constructor() {
    this.api.orders().subscribe((all) => {
      this.orders.set(all.filter((o) => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Pre-Order' && o.balanceDue > 0));
      this.loaded.set(true);
    });
  }

  protected onOrder(orderId: number): void {
    this.selectedId.set(orderId);
    const o = this.orders().find((x) => x.orderId === orderId);
    if (!o) return;
    // Suggest the sensible next installment: first payment = advance, otherwise settle the balance.
    this.form.patchValue({ amount: o.balanceDue, paymentType: o.totalPaid === 0 ? 'Booking Advance' : 'Final Delivery Balance' });
  }

  protected save(): void {
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.api.addPayment(v.orderId!, {
      paymentType: v.paymentType, paymentMode: v.paymentMode, amount: v.amount!,
      paymentDate: v.paymentDate || null, transactionRef: v.transactionRef || null, notes: null,
    }).subscribe({
      next: () => { this.snack.open('Payment recorded', 'OK', { duration: 2500 }); this.ref.close(true); },
      error: (e) => { this.saving.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  /** Opens the dialog; emits true when a payment was saved. */
  static open(dialog: MatDialog): Observable<boolean | undefined> {
    return dialog.open<RecordPaymentDialog, void, boolean>(RecordPaymentDialog, { width: 'min(94vw, 560px)' }).afterClosed();
  }
}
