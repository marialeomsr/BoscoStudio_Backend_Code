import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { StudioApi } from '../../../core/api/studio-api';
import { AuthService } from '../../../core/auth/auth.service';
import {
  ALBUM_STAGES, Album, CreateAlbumRequest, ORDER_STATUSES, CreateExpenseRequest, CreatePaymentRequest, EXPENSE_CATEGORIES,
  DocumentType, ExpenseCategory, OrderDetail, PackageInfo, PAYMENT_MODES, PAYMENT_TYPES, PaymentMode, PaymentType, UpdateDeliverableRequest, WORK_STATUSES,
} from '../../../core/models/studio.models';
import { describeError } from '../../../shared/api-error';
import { AlbumEditDialog } from '../../../shared/components/album-edit-dialog';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog';
import { StatusBadge } from '../../../shared/components/status-badge';
import { today } from '../../../shared/date-utils';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { AutoError, httpUrl, intRange, money, notFuture, phoneOrEmail, positiveMoney, transactionRef } from '../../../shared/validators';

// Strongly typed form shapes (one per form, kept next to the component that owns them).
type PaymentForm = FormGroup<{
  paymentType: FormControl<PaymentType>;
  paymentMode: FormControl<PaymentMode>;
  amount: FormControl<number | null>;
  paymentDate: FormControl<string>;
  transactionRef: FormControl<string>;
}>;
type ExpenseForm = FormGroup<{
  category: FormControl<ExpenseCategory>;
  description: FormControl<string>;
  amount: FormControl<number | null>;
}>;
type DeliverableForm = FormGroup<{
  selectionMode: FormControl<string>;
  selectionStatus: FormControl<string>;
  photoEditStatus: FormControl<string>;
  teaserEditStatus: FormControl<string>;
  fullFilmEditStatus: FormControl<string>;
  cloudProvider: FormControl<string>;
  cloudLink: FormControl<string>;
  deliveredOn: FormControl<string>;
}>;
type AlbumForm = FormGroup<{
  packageId: FormControl<number | null>;
  albumType: FormControl<string>;
  sellingPrice: FormControl<number | null>;
  sheetCount: FormControl<number | null>;
  printVendorName: FormControl<string>;
  printVendorContact: FormControl<string>;
  printCost: FormControl<number | null>;
}>;


/**
 * Order detail: summary, status actions, schedule, payments (+ add form), expenses, albums (stage tracker).
 * Layout: single column on phones, two columns from 960px (summary/money left, workflow right).
 * Route param :id is bound to the `id` input (withComponentInputBinding in app.config.ts).
 */
@Component({
  selector: 'app-order-detail',
  imports: [
    ReactiveFormsModule, RouterLink, AutoError, DatePipe, InrPipe, StatusBadge,
    MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
  ],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetailPage {
  protected readonly auth = inject(AuthService);
  /** Packages that include an Album part, to prefill the "add album" form. */
  protected readonly albumPackages = signal<PackageInfo[]>([]);
  private readonly api = inject(StudioApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly id = input.required({ transform: numberAttribute });

  protected readonly order = signal<OrderDetail | null>(null);
  protected readonly loadError = signal('');
  protected readonly busy = signal(false);

  protected readonly paymentTypes = PAYMENT_TYPES;
  protected readonly paymentModes = PAYMENT_MODES;
  protected readonly expenseCategories = EXPENSE_CATEGORIES;
  protected readonly albumStages = ALBUM_STAGES;
  protected readonly workStatuses = WORK_STATUSES;
  protected readonly cloudProviders = ['Google Drive', 'WeTransfer', 'Dropbox', 'Other'];

  /** 0-100 for the "paid" progress bar. */
  protected readonly paidPercent = computed(() => {
    const o = this.order();
    return o && o.grandTotal > 0 ? Math.min(100, Math.round((o.totalPaid / o.grandTotal) * 100)) : 0;
  });
  /** The order's journey (Cancelled is a side exit, not a stage). */
  protected readonly orderStages = ORDER_STATUSES.filter((s) => s !== 'Cancelled');

  protected orderStageState(stage: string): 'done' | 'current' | 'todo' {
    const cur = this.orderStages.findIndex((s) => s === this.order()?.orderStatus), i = this.orderStages.findIndex((s) => s === stage);
    return i < cur ? 'done' : i === cur ? 'current' : 'todo';
  }

  /** The neighbouring stage, only when the API allows that move (Delivered is final, one step back at most). */
  private neighbour(offset: -1 | 1): string | null {
    const o = this.order();
    const target = this.orderStages[this.orderStages.findIndex((s) => s === o?.orderStatus) + offset];
    return target && o?.allowedNextStatuses.some((s) => s === target) ? target : null;
  }
  protected readonly previousOrderStage = computed(() => this.neighbour(-1));
  protected readonly nextOrderStage = computed(() => this.neighbour(1));

  protected readonly canRecordPayment = computed(() => {
    const o = this.order();
    return !!o && o.orderStatus !== 'Cancelled' && o.balanceDue > 0;
  });

  protected readonly showPaymentForm = signal(false);
  protected readonly showExpenseForm = signal(false);
  protected readonly showAlbumForm = signal(false);
  protected readonly showDeliverableForm = signal(false);

  protected readonly canEdit = computed(() => !['Delivered', 'Cancelled'].includes(this.order()?.orderStatus ?? ''));
  /** Invoices are official: only once the order is Confirmed (quotations are always allowed). */
  protected readonly canInvoice = computed(() => ['Confirmed', 'Shoot Completed', 'In Post-Production', 'Delivered'].includes(this.order()?.orderStatus ?? ''));

  protected readonly paymentForm: PaymentForm = this.fb.group({
    paymentType: this.fb.control<PaymentType>('Booking Advance'),
    paymentMode: this.fb.control<PaymentMode>('UPI'),
    amount: this.fb.control<number | null>(null, [Validators.required, positiveMoney]),
    paymentDate: this.fb.control(today(), notFuture),
    transactionRef: this.fb.control('', [transactionRef, Validators.maxLength(100)]),
  });
  protected readonly expenseForm: ExpenseForm = this.fb.group({
    category: this.fb.control<ExpenseCategory>('Second Shooter'),
    description: this.fb.control('', Validators.maxLength(300)),
    amount: this.fb.control<number | null>(null, [Validators.required, positiveMoney]),
  });
  protected readonly albumForm: AlbumForm = this.fb.group({
    packageId: this.fb.control<number | null>(null),
    albumType: this.fb.control('', [Validators.required, Validators.maxLength(60)]),
    sellingPrice: this.fb.control<number | null>(0, money),
    sheetCount: this.fb.control<number | null>(30, [Validators.required, intRange(1, 500)]),
    printVendorName: this.fb.control('', Validators.maxLength(120)),
    printVendorContact: this.fb.control('', [phoneOrEmail, Validators.maxLength(60)]),
    printCost: this.fb.control<number | null>(null, money),
  });

  protected readonly deliverableForm: DeliverableForm = this.fb.group({
    selectionMode: this.fb.control('Client Selection'),
    selectionStatus: this.fb.control('Not Started'),
    photoEditStatus: this.fb.control('Not Started'),
    teaserEditStatus: this.fb.control('Not Started'),
    fullFilmEditStatus: this.fb.control('Not Started'),
    cloudProvider: this.fb.control(''),
    cloudLink: this.fb.control('', [httpUrl, Validators.maxLength(500)]),
    deliveredOn: this.fb.control('', notFuture),
  });

  ngOnInit(): void {
    this.reload();   // route input `id` is available from ngOnInit onwards
    this.api.packages().subscribe((p) => this.albumPackages.set(p.filter((x) => x.albumPrice !== null)));
  }

  protected reload(): void {
    this.api.order(this.id()).subscribe({
      next: (o) => this.order.set(o),
      error: (e) => this.loadError.set(describeError(e)),
    });
  }

  // ---------- Status ----------

  protected changeStatus(status: string): void {
    const o = this.order()!;
    const run = () => this.run(this.api.changeStatus(o.orderId, status), `Moved to ${status}`, (d) => this.order.set(d));
    if (status === 'Cancelled')
      ConfirmDialog.ask(this.dialog, {
        title: 'Cancel this order?', message: 'The calendar slots are released. Payments already received are kept.', confirmText: 'Cancel order',
      }).subscribe((yes) => yes && run());
    else run();
  }

  // ---------- Payments ----------

  protected fillBalance(): void {
    this.paymentForm.controls.amount.setValue(this.order()!.balanceDue);
  }

  protected savePayment(): void {
    if (this.paymentForm.invalid) return;
    const f = this.paymentForm.getRawValue();
    const body: CreatePaymentRequest = {
      paymentType: f.paymentType, paymentMode: f.paymentMode, amount: f.amount!,
      paymentDate: f.paymentDate || null, transactionRef: f.transactionRef || null, notes: null,
    };
    this.run(this.api.addPayment(this.order()!.orderId, body), 'Payment recorded', () => {
      this.paymentForm.reset({ paymentType: 'Shoot-Day Payment', paymentMode: 'UPI', paymentDate: today() });
      this.showPaymentForm.set(false);
      this.reload();
    });
  }

  protected deletePayment(paymentId: number): void {
    ConfirmDialog.ask(this.dialog, { title: 'Delete payment?', message: 'The balance will be recalculated.', confirmText: 'Delete' })
      .subscribe((yes) => yes && this.run(this.api.deletePayment(this.order()!.orderId, paymentId), 'Payment deleted', () => this.reload()));
  }

  // ---------- Expenses ----------

  protected saveExpense(): void {
    if (this.expenseForm.invalid) return;
    const f = this.expenseForm.getRawValue();
    const body: CreateExpenseRequest = { category: f.category, description: f.description || null, amount: f.amount!, expenseDate: null };
    this.run(this.api.addExpense(this.order()!.orderId, body), 'Expense added', () => {
      this.expenseForm.reset({ category: 'Second Shooter' });
      this.showExpenseForm.set(false);
      this.reload();
    });
  }

  protected deleteExpense(expenseId: number): void {
    this.run(this.api.deleteExpense(this.order()!.orderId, expenseId), 'Expense removed', () => this.reload());
  }

  // ---------- Albums ----------

  /** Picking an album package fills the name and selling price; both can still be changed for this client. */
  protected pickAlbumPackage(packageId: number | null): void {
    const p = this.albumPackages().find((x) => x.packageId === packageId);
    if (!p) return;
    // When the order already includes the Album part its price is in the order total, so the extra price stays 0.
    this.albumForm.patchValue({ albumType: p.packageName.slice(0, 60), sellingPrice: this.order()?.includesAlbum ? 0 : p.albumPrice ?? 0 });
  }

  protected saveAlbum(): void {
    if (this.albumForm.invalid) return;
    const f = this.albumForm.getRawValue();
    const body: CreateAlbumRequest = {
      albumType: f.albumType, sheetCount: f.sheetCount!, printVendorName: f.printVendorName || null,
      printVendorContact: f.printVendorContact || null, printCost: f.printCost,
      sellingPrice: this.order()!.includesAlbum ? 0 : f.sellingPrice ?? 0, packageId: f.packageId, notes: null,
    };
    this.run(this.api.addAlbum(this.order()!.orderId, body), 'Album added', () => {
      this.albumForm.reset({ sheetCount: 30, sellingPrice: 0 });
      this.showAlbumForm.set(false);
      this.reload();
    });
  }

  protected moveAlbum(album: Album, stage: string | null): void {
    if (!stage) return;
    const advance = () => this.run(this.api.changeAlbumStage(album.albumId, stage), `Album: ${stage}`, () => this.reload());

    // The print lab needs a vendor: ask for it right here instead of failing.
    if (stage === 'Sent to Print Lab' && !album.printVendorName) {
      AlbumEditDialog.open(this.dialog, { album, priceIncluded: this.order()?.includesAlbum, hint: 'Enter the print vendor to send this album to the print lab.' })
        .subscribe((saved) => saved?.printVendorName && advance());
    } else advance();
  }

  protected editAlbum(album: Album): void {
    AlbumEditDialog.open(this.dialog, { album, priceIncluded: this.order()?.includesAlbum }).subscribe((saved) => {
      if (saved) { this.snack.open('Album details saved', 'OK', { duration: 2500 }); this.reload(); }
    });
  }

  protected previousStage(album: Album): string | null {
    const i = ALBUM_STAGES.indexOf(album.albumStage);
    return i > 0 ? ALBUM_STAGES[i - 1] : null;
  }

  protected stageState(album: Album, stage: string): 'done' | 'current' | 'todo' {
    const cur = ALBUM_STAGES.indexOf(album.albumStage), i = ALBUM_STAGES.indexOf(stage as never);
    return i < cur ? 'done' : i === cur ? 'current' : 'todo';
  }

  // ---------- Documents ----------

  protected documentOf(type: DocumentType) {
    return this.order()?.documents.find((d) => d.documentType === type) ?? null;
  }

  /** Orders with money recorded (payments / invoice) can only be cancelled, never deleted. */
  protected readonly canDelete = computed(() => {
    const o = this.order();
    return this.auth.can('orders.delete') && !!o && o.payments.length === 0 && !o.documents.some((d) => d.documentType === 'Invoice');
  });

  protected deleteOrder(): void {
    const o = this.order()!;
    const extras = [o.albums.length && `${o.albums.length} album(s)`, o.documents.length && 'its quotation'].filter(Boolean).join(' and ');
    ConfirmDialog.ask(this.dialog, {
      title: `Delete ${o.orderNumber}?`,
      message: `This permanently removes the order${extras ? `, ${extras}` : ''}, its schedule and expenses. This cannot be undone. (Use Cancel to keep a record.)`,
      confirmText: 'Delete order',
    }).subscribe((yes) => yes && this.run(this.api.deleteOrder(o.orderId), 'Order deleted', () => this.router.navigate(['/orders'])));
  }

  protected issueDocument(documentType: DocumentType): void {
    this.run(this.api.createDocument(this.order()!.orderId, { documentType, dueDate: null, notes: null, terms: null }),
      `${documentType} created`, (doc) => this.router.navigate(['/invoices', doc.documentId]));
  }

  // ---------- Deliverables ----------

  protected openDeliverableForm(): void {
    const d = this.order()!.deliverable;
    if (d) this.deliverableForm.patchValue({ ...d, cloudProvider: d.cloudProvider ?? '', cloudLink: d.cloudLink ?? '', deliveredOn: d.deliveredOn ?? '' });
    this.showDeliverableForm.set(true);
  }

  protected saveDeliverable(): void {
    const f = this.deliverableForm.getRawValue();
    const body = {
      ...f, cloudProvider: f.cloudProvider || null, cloudLink: f.cloudLink || null, deliveredOn: f.deliveredOn || null,
    } as UpdateDeliverableRequest;
    this.run(this.api.updateDeliverables(this.order()!.orderId, body), 'Deliverables saved', (o) => {
      this.order.set(o);
      this.showDeliverableForm.set(false);
    });
  }

  // ---------- Helpers ----------

  /** Runs a call with a busy flag, then success snackbar or error snackbar. */
  private run<T>(call: Observable<T>, success: string, onDone: (result: T) => void): void {
    this.busy.set(true);
    call.subscribe({
      next: (result) => { this.busy.set(false); this.snack.open(success, 'OK', { duration: 2500 }); onDone(result); },
      error: (e) => { this.busy.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }
}


