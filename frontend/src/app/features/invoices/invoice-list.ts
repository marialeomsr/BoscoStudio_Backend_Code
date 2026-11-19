import { DatePipe } from '@angular/common';
import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { StudioApi } from '../../core/api/studio-api';
import { AuthService } from '../../core/auth/auth.service';
import { DocumentSummary, DocumentType, OrderSummary } from '../../core/models/studio.models';
import { describeError } from '../../shared/api-error';
import { Pager, pageOf } from '../../shared/components/pager';
import { InrPipe } from '../../shared/pipes/inr.pipe';

/** Same rule as the order page: an invoice is official, so only once the order is Confirmed (quotations are always allowed). */
const INVOICEABLE = ['Confirmed', 'Shoot Completed', 'In Post-Production', 'Delivered'];

/** Quotations and invoices. New ones can be created here (pick the order) or from the order's own page. */
@Component({
  selector: 'app-invoice-list',
  imports: [DatePipe, RouterLink, InrPipe, Pager, MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  template: `
    <header class="page-head amber">
      <span class="ico"><mat-icon>description</mat-icon></span>
      <h1>Quotations &amp; invoices <span class="sub">{{ visible().length }} shown</span></h1>
      @if (auth.can('documents.manage')) {
        <div class="actions">
          <button mat-stroked-button type="button" (click)="startCreate('Quotation')"><mat-icon>request_quote</mat-icon> New quotation</button>
          <button mat-flat-button type="button" (click)="startCreate('Invoice')"><mat-icon>receipt</mat-icon> New invoice</button>
        </div>
      }
    </header>

    @if (creating(); as kind) {
      <div class="panel slim amber creator">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="pick">
          <mat-label>Order for the new {{ kind.toLowerCase() }}</mat-label>
          <mat-select [value]="orderId()" (selectionChange)="orderId.set($event.value)">
            @for (o of eligible(); track o.orderId) {
              <mat-option [value]="o.orderId">{{ o.orderNumber }} · {{ o.clientName }} · {{ o.eventDate | date: 'd MMM yyyy' }} · {{ o.orderStatus }}</mat-option>
            } @empty { <mat-option disabled>No order needs a {{ kind.toLowerCase() }} right now</mat-option> }
          </mat-select>
          @if (kind === 'Invoice') { <mat-hint>Invoices can be created once the order is Confirmed.</mat-hint> }
        </mat-form-field>
        <div class="creator-actions">
          <button mat-button type="button" (click)="creating.set(null)">Cancel</button>
          <button mat-flat-button type="button" [disabled]="orderId() === null || busy()" (click)="create(kind)">Create {{ kind.toLowerCase() }}</button>
        </div>
      </div>
    }

    <div class="tiles" role="group" aria-label="Document type">
      <button type="button" class="tile slate" [class.on]="type() === ''" (click)="type.set('')"><strong>{{ all().length }}</strong><small>All</small></button>
      <button type="button" class="tile blue" [class.on]="type() === 'Quotation'" (click)="type.set('Quotation')"><strong>{{ countOf('Quotation') }}</strong><small>Quotations</small></button>
      <button type="button" class="tile green" [class.on]="type() === 'Invoice'" (click)="type.set('Invoice')"><strong>{{ countOf('Invoice') }}</strong><small>Invoices</small></button>
    </div>

    <section class="panel amber tablewrap">
    <table class="grid dtable">
      <thead><tr><th>Number</th><th>Type</th><th>Client</th><th>Issued</th><th class="num">Total</th><th class="num">Balance</th></tr></thead>
      <tbody>
        @for (d of rows(); track d.documentId) {
          <tr [routerLink]="['/invoices', d.documentId]">
            <td data-label="Number"><strong>{{ d.documentNumber }}</strong></td>
            <td data-label="Type">{{ d.documentType }}</td>
            <td data-label="Client">{{ d.clientName }}</td>
            <td data-label="Issued">{{ d.issueDate | date: 'd MMM yyyy' }}</td>
            <td data-label="Total" class="num">{{ d.total | inr }}</td>
            <td data-label="Balance" class="num" [class.due]="d.balanceDue > 0">{{ d.balanceDue | inr }}</td>
          </tr>
        } @empty { <tr><td colspan="6">Nothing issued yet. Use “New quotation” or “New invoice” above, or open an order.</td></tr> }
      </tbody>
    </table>
    <app-pager [total]="visible().length" [(page)]="page" />
    </section>
  `,
  styles: `
    :host { display: block; max-width: 1200px; margin: 0 auto; }
    .creator { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
    .pick { flex: 1 1 340px; }
    .creator-actions { display: flex; gap: 8px; margin-left: auto; }
    .tablewrap { padding: 0 8px 8px; overflow: hidden; }
    .grid { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    tbody tr { cursor: pointer; } tbody tr:hover { background: var(--mat-sys-surface-container-low); }
    .num { text-align: right; } .due { color: var(--mat-sys-error); font-weight: 500; }
    @media (max-width: 719px) {
      thead { display: none; } tr, td { display: block; }
      tr { border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; padding: 8px 12px; margin-bottom: 10px; }
      td { display: flex; justify-content: space-between; border: 0; padding: 4px 0; text-align: right; }
      td::before { content: attr(data-label); color: var(--mat-sys-on-surface-variant); }
    }
  `,
})
export class InvoiceList {
  private readonly api = inject(StudioApi);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  protected readonly auth = inject(AuthService);

  protected readonly all = signal<DocumentSummary[]>([]);
  protected readonly type = signal('');
  protected readonly visible = computed(() => this.all().filter((d) => !this.type() || d.documentType === this.type()));
  /** 15 per page; back to page 1 when the All / Quotations / Invoices filter changes. */
  protected readonly page = linkedSignal({ source: this.visible, computation: () => 1 });
  protected readonly rows = computed(() => pageOf(this.visible(), this.page()));

  // ----- creating a new document from this page -----
  protected readonly creating = signal<DocumentType | null>(null);
  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly orderId = signal<number | null>(null);
  protected readonly busy = signal(false);

  /** Orders that can still get this kind of document: not cancelled, none of that kind yet (and Confirmed or later for an invoice). */
  protected readonly eligible = computed(() => {
    const kind = this.creating();
    if (!kind) return [];
    const done = new Set(this.all().filter((d) => d.documentType === kind).map((d) => d.orderId));
    return this.orders().filter((o) => !done.has(o.orderId) && o.orderStatus !== 'Cancelled' && (kind === 'Quotation' || INVOICEABLE.includes(o.orderStatus)));
  });

  protected countOf(type: string): number {
    return this.all().filter((d) => d.documentType === type).length;
  }

  protected startCreate(kind: DocumentType): void {
    this.orderId.set(null);
    this.creating.set(kind);
    this.api.orders().subscribe((o) => this.orders.set(o));   // fresh list each time, newest changes included
  }

  protected create(kind: DocumentType): void {
    const id = this.orderId();
    if (id === null) return;
    this.busy.set(true);
    this.api.createDocument(id, { documentType: kind, dueDate: null, notes: null, terms: null }).subscribe({
      next: (doc) => { this.snack.open(`${kind} created`, 'OK', { duration: 2500 }); this.router.navigate(['/invoices', doc.documentId]); },
      error: (e) => { this.busy.set(false); this.snack.open(describeError(e), 'Dismiss', { duration: 6000 }); },
    });
  }

  constructor() {
    this.api.documents().subscribe((d) => this.all.set(d));
  }
}
