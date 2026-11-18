import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { Observable, startWith } from 'rxjs';
import { StudioApi } from '../../../core/api/studio-api';
import {
  Client, CreateOrderRequest, EventSlotRequest, EventTypeInfo, OrderDetail, PackageInfo, UpdateOrderRequest,
} from '../../../core/models/studio.models';
import { describeError } from '../../../shared/api-error';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog';
import { today } from '../../../shared/date-utils';
import { InrPipe } from '../../../shared/pipes/inr.pipe';

type SlotGroup = FormGroup<{
  eventDate: FormControl<string>;
  startTime: FormControl<string>;
  endTime: FormControl<string>;
  title: FormControl<string>;
}>;

/** Create (orders/new?date=yyyy-MM-dd) and edit (orders/:id/edit) in one form. */
@Component({
  selector: 'app-order-form',
  imports: [ReactiveFormsModule, RouterLink, InrPipe, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule],
  templateUrl: './order-form.html',
  styleUrl: './order-form.scss',
})
export class OrderForm {
  private readonly api = inject(StudioApi);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  /** Route params / query params bound by withComponentInputBinding. */
  readonly id = input<string>();
  readonly date = input<string>();

  protected readonly eventTypes = signal<EventTypeInfo[]>([]);
  protected readonly clients = signal<Client[]>([]);
  protected readonly packages = signal<PackageInfo[]>([]);
  protected readonly newClientMode = signal(false);
  protected readonly saving = signal(false);
  protected readonly isEdit = computed(() => !!this.id());

  protected readonly form = this.fb.group({
    clientId: this.fb.control<number | null>(null),
    newClient: this.fb.group({
      fullName: [''], phone: [''], whatsAppNo: [''], email: ['', Validators.email],
    }),
    initialStatus: this.fb.control<'Pre-Order' | 'Pending' | 'Confirmed'>('Pre-Order'),
    eventType: this.fb.control('', Validators.required),
    packageId: this.fb.control<number | null>(null),
    venue: this.fb.control(''),
    notes: this.fb.control(''),
    packageAmount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    discountAmount: this.fb.control(0, Validators.min(0)),
    taxPercent: this.fb.control<number | null>(0, [Validators.min(0), Validators.max(100)]),
    slots: this.fb.array<SlotGroup>([]),
  });

  private readonly formValue = toSignal(this.form.valueChanges.pipe(startWith(null)));

  /** Packages offered for the selected event type (plus packages that apply to any event). */
  protected readonly filteredPackages = computed(() => {
    this.formValue();
    const type = this.form.controls.eventType.value;
    return this.packages().filter((p) => !p.eventType || p.eventType === type);
  });

  /** Live preview that mirrors the SQL computed columns. */
  protected readonly preview = computed(() => {
    this.formValue();
    const v = this.form.getRawValue();
    const net = Math.max(0, (v.packageAmount ?? 0) - v.discountAmount);
    const tax = Math.round(net * (v.taxPercent ?? 0)) / 100;
    return { net, tax, total: net + tax };
  });

  get slots(): FormArray<SlotGroup> { return this.form.controls.slots; }

  ngOnInit(): void {
    this.api.packages().subscribe((p) => this.packages.set(p));
    this.api.eventTypes().subscribe((types) => {
      const current = this.form.controls.eventType.value;   // edit mode may have loaded the order first
      this.eventTypes.set(current && !types.some((t) => t.eventTypeName === current)
        ? [...types, { eventTypeId: 0, eventTypeName: current, sortOrder: 99, isActive: false, orderCount: 0, packageCount: 0 }]
        : types);
      // New order: preselect the first event type so its packages show immediately.
      if (!this.isEdit() && types.length && !this.form.controls.eventType.value) this.form.controls.eventType.setValue(types[0].eventTypeName);
    });
    this.api.clients().subscribe((c) => this.clients.set(c));

    if (this.id()) {
      this.api.order(Number(this.id())).subscribe({
        next: (o) => this.fillFrom(o),
        error: (e) => this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }),
      });
    } else {
      this.addSlot(this.date());
      this.api.defaultTax().subscribe((t) => this.form.controls.taxPercent.setValue(t));
    }
  }

  // ---------- Slots ----------

  protected addSlot(date?: string, start = '09:00', end = '13:00', title = ''): void {
    this.slots.push(this.fb.group({
      eventDate: this.fb.control(date || today(), Validators.required),
      startTime: this.fb.control(start, Validators.required),
      endTime: this.fb.control(end, Validators.required),
      title: this.fb.control(title),
    }));
  }

  protected removeSlot(i: number): void {
    if (this.slots.length > 1) this.slots.removeAt(i);
  }

  // ---------- Field helpers ----------

  protected onEventTypeChange(): void {
    // Drop a package that belongs to another event type.
    const id = this.form.controls.packageId.value;
    if (id !== null && !this.filteredPackages().some((p) => p.packageId === id)) this.form.controls.packageId.setValue(null);
  }

  protected onPackageChange(id: number | null): void {
    const pkg = this.packages().find((p) => p.packageId === id);
    if (pkg) this.form.patchValue({ packageAmount: pkg.basePrice });
  }

  protected toggleNewClient(): void {
    this.newClientMode.update((v) => !v);
    const nc = this.form.controls.newClient.controls;
    const on = this.newClientMode();
    nc.fullName.setValidators(on ? Validators.required : null);
    nc.phone.setValidators(on ? Validators.required : null);
    nc.fullName.updateValueAndValidity();
    nc.phone.updateValueAndValidity();
    this.form.controls.clientId.setValidators(on ? null : Validators.required);
    this.form.controls.clientId.updateValueAndValidity();
  }

  private fillFrom(o: OrderDetail): void {
    this.form.patchValue({
      clientId: o.client.clientId, eventType: o.eventType, packageId: o.packageId, venue: o.venue ?? '', notes: o.notes ?? '',
      packageAmount: o.packageAmount, discountAmount: o.discountAmount, taxPercent: o.taxPercent,
    });
    if (!this.eventTypes().some((t) => t.eventTypeName === o.eventType))   // inactive type already used by this order
      this.eventTypes.update((list) => [...list, { eventTypeId: 0, eventTypeName: o.eventType, sortOrder: 99, isActive: false, orderCount: 0, packageCount: 0 }]);
    this.slots.clear();
    o.slots.forEach((s) => this.addSlot(s.eventDate, s.startTime.slice(0, 5), s.endTime.slice(0, 5), s.title ?? ''));
  }

  // ---------- Save ----------

  protected save(allowOverlap = false): void {
    if (!this.isEdit() && !this.newClientMode()) this.form.controls.clientId.setValidators(Validators.required);
    this.form.controls.clientId.updateValueAndValidity();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const slots: EventSlotRequest[] = v.slots.map((s) => ({
      eventDate: s.eventDate, startTime: `${s.startTime}:00`, endTime: `${s.endTime}:00`, title: s.title || null, venue: null,
    }));
    const base: UpdateOrderRequest = {
      packageId: v.packageId, eventType: v.eventType, venue: v.venue || null, notes: v.notes || null,
      packageAmount: v.packageAmount, discountAmount: v.discountAmount, taxPercent: v.taxPercent, slots, allowOverlap,
    };

    let call: Observable<OrderDetail>;
    if (this.isEdit()) {
      call = this.api.updateOrder(Number(this.id()), base);
    } else {
      const body: CreateOrderRequest = {
        ...base,
        clientId: this.newClientMode() ? null : v.clientId,
        newClient: this.newClientMode()
          ? { fullName: v.newClient.fullName, phone: v.newClient.phone, whatsAppNo: v.newClient.whatsAppNo || null, email: v.newClient.email || null, address: null }
          : null,
        initialStatus: v.initialStatus,
      };
      call = this.api.createOrder(body);
    }

    this.saving.set(true);
    call.subscribe({
      next: (o) => {
        this.snack.open(this.isEdit() ? 'Order updated' : `Order ${o.orderNumber} created`, 'OK', { duration: 2500 });
        this.router.navigate(['/orders', o.orderId]);
      },
      error: (e: unknown) => {
        this.saving.set(false);
        if (e instanceof HttpErrorResponse && e.status === 409) {
          // Double booking: let the owner decide.
          ConfirmDialog.ask(this.dialog, {
            title: 'Slot already booked', message: `${e.error?.detail ?? 'This slot overlaps another booking.'} Book anyway?`, confirmText: 'Book anyway',
          }).subscribe((yes) => yes && this.save(true));
        } else {
          this.snack.open(describeError(e), 'Dismiss', { duration: 6000 });
        }
      },
    });
  }
}
