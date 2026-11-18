import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { RouterLink } from '@angular/router';
import { StudioApi } from '../../core/api/studio-api';
import { DocumentSummary } from '../../core/models/studio.models';
import { InrPipe } from '../../shared/pipes/inr.pipe';

/** Quotations and invoices. New ones are issued from an order's detail page. */
@Component({
  selector: 'app-invoice-list',
  imports: [DatePipe, RouterLink, InrPipe, MatButtonToggleModule],
  template: `
    <h1>Quotations &amp; invoices</h1>
    <mat-button-toggle-group [value]="type()" (change)="type.set($event.value)" hideSingleSelectionIndicator aria-label="Document type">
      <mat-button-toggle value="">All</mat-button-toggle>
      <mat-button-toggle value="Quotation">Quotations</mat-button-toggle>
      <mat-button-toggle value="Invoice">Invoices</mat-button-toggle>
    </mat-button-toggle-group>

    <table class="grid">
      <thead><tr><th>Number</th><th>Type</th><th>Client</th><th>Issued</th><th class="num">Total</th><th class="num">Balance</th></tr></thead>
      <tbody>
        @for (d of visible(); track d.documentId) {
          <tr [routerLink]="['/invoices', d.documentId]">
            <td data-label="Number"><strong>{{ d.documentNumber }}</strong></td>
            <td data-label="Type">{{ d.documentType }}</td>
            <td data-label="Client">{{ d.clientName }}</td>
            <td data-label="Issued">{{ d.issueDate | date: 'd MMM yyyy' }}</td>
            <td data-label="Total" class="num">{{ d.total | inr }}</td>
            <td data-label="Balance" class="num" [class.due]="d.balanceDue > 0">{{ d.balanceDue | inr }}</td>
          </tr>
        } @empty { <tr><td colspan="6">Nothing issued yet. Open an order and choose “Quotation” or “Invoice”.</td></tr> }
      </tbody>
    </table>
  `,
  styles: `
    h1 { font-size: 22px; margin: 0 0 12px; }
    .grid { width: 100%; border-collapse: collapse; margin-top: 16px; }
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
  protected readonly all = signal<DocumentSummary[]>([]);
  protected readonly type = signal('');
  protected readonly visible = computed(() => this.all().filter((d) => !this.type() || d.documentType === this.type()));

  constructor() {
    inject(StudioApi).documents().subscribe((d) => this.all.set(d));
  }
}
