import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Album, CalendarItem, ChangePasswordRequest, ClientRecord, SaveClientRequest, CreateAlbumRequest, CreateDocumentRequest, CreateOrderRequest, DocumentDetail, DocumentSummary,
  PackageInfo, PaymentLedgerItem, UpdateOrderRequest, CreateExpenseRequest, CreatePaymentRequest, Dashboard, Expense,
  OrderDetail, OrderSummary, Payment, UpdateAlbumRequest, UpdateDeliverableRequest,
  CreateOwnerRequest, UpdateOwnerRequest, Branding, LoginResponse, OwnerInfo, OwnerRole, UpdateProfileRequest,
  Studio, CreateStudioRequest, UpdateStudioRequest, RoleInfo, SaveRoleRequest,
  DateRangeReport, LoginAudit, EventTypeInfo, SaveEventTypeRequest, SavePackageRequest, StudioSettings, UpdateDocumentRequest,
} from '../models/studio.models';

export interface LoginReportFilter { from?: string; to?: string; studioId?: string; username?: string; eventType?: string }

/** One thin class per backend controller area, all in one file so a request can be traced in seconds. */
@Injectable({ providedIn: 'root' })
export class StudioApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  // ----- Orders -----
  orders(filter: { status?: string; search?: string; from?: string; to?: string } = {}): Observable<OrderSummary[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) if (value) params = params.set(key, value);
    return this.http.get<OrderSummary[]>(`${this.base}/orders`, { params });
  }
  order(id: number): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.base}/orders/${id}`);
  }
  calendar(from: string, to: string): Observable<CalendarItem[]> {
    return this.http.get<CalendarItem[]>(`${this.base}/orders/calendar`, { params: { from, to } });
  }
  changeStatus(id: number, status: string): Observable<OrderDetail> {
    return this.http.patch<OrderDetail>(`${this.base}/orders/${id}/status`, { status });
  }
  updateDeliverables(id: number, body: UpdateDeliverableRequest): Observable<OrderDetail> {
    return this.http.put<OrderDetail>(`${this.base}/orders/${id}/deliverables`, body);
  }
  deleteOrder(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/orders/${id}`);
  }

  // ----- Payments & expenses -----
  addPayment(orderId: number, body: CreatePaymentRequest): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/orders/${orderId}/payments`, body);
  }
  deletePayment(orderId: number, paymentId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/orders/${orderId}/payments/${paymentId}`);
  }
  addExpense(orderId: number, body: CreateExpenseRequest): Observable<Expense> {
    return this.http.post<Expense>(`${this.base}/orders/${orderId}/expenses`, body);
  }
  deleteExpense(orderId: number, expenseId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/orders/${orderId}/expenses/${expenseId}`);
  }

  // ----- Albums -----
  albums(filter: { stage?: string; awaitingOwnerOnly?: boolean } = {}): Observable<Album[]> {
    let params = new HttpParams();
    if (filter.stage) params = params.set('stage', filter.stage);
    if (filter.awaitingOwnerOnly) params = params.set('awaitingOwnerOnly', true);
    return this.http.get<Album[]>(`${this.base}/albums`, { params });
  }
  addAlbum(orderId: number, body: CreateAlbumRequest): Observable<Album> {
    return this.http.post<Album>(`${this.base}/orders/${orderId}/albums`, body);
  }
  updateAlbum(albumId: number, body: UpdateAlbumRequest): Observable<Album> {
    return this.http.put<Album>(`${this.base}/albums/${albumId}`, body);
  }
  changeAlbumStage(albumId: number, stage: string): Observable<Album> {
    return this.http.patch<Album>(`${this.base}/albums/${albumId}/stage`, { stage });
  }
  deleteAlbum(albumId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/albums/${albumId}`);
  }

  // ----- Order create / edit -----
  createOrder(body: CreateOrderRequest): Observable<OrderDetail> {
    return this.http.post<OrderDetail>(`${this.base}/orders`, body);
  }
  updateOrder(id: number, body: UpdateOrderRequest): Observable<OrderDetail> {
    return this.http.put<OrderDetail>(`${this.base}/orders/${id}`, body);
  }
  // ----- Clients -----
  clients(search = ''): Observable<ClientRecord[]> {
    return this.http.get<ClientRecord[]>(`${this.base}/clients`, { params: { search } });
  }
  createClient(body: SaveClientRequest): Observable<ClientRecord> {
    return this.http.post<ClientRecord>(`${this.base}/clients`, body);
  }
  updateClient(id: number, body: SaveClientRequest): Observable<ClientRecord> {
    return this.http.put<ClientRecord>(`${this.base}/clients/${id}`, body);
  }
  deleteClient(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/clients/${id}`);
  }

  // ----- Account & owners -----
  changePassword(body: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/auth/change-password`, body);
  }
  me(): Observable<OwnerInfo> {
    return this.http.get<OwnerInfo>(`${this.base}/auth/me`);
  }
  /** Returns a fresh session: the old token still carries the old username. */
  updateProfile(body: UpdateProfileRequest): Observable<LoginResponse> {
    return this.http.put<LoginResponse>(`${this.base}/auth/profile`, body);
  }
  owners(): Observable<OwnerInfo[]> {
    return this.http.get<OwnerInfo[]>(`${this.base}/owners`);
  }
  createOwner(body: CreateOwnerRequest): Observable<OwnerInfo> {
    return this.http.post<OwnerInfo>(`${this.base}/owners`, body);
  }
  updateOwner(id: number, body: UpdateOwnerRequest): Observable<OwnerInfo> {
    return this.http.put<OwnerInfo>(`${this.base}/owners/${id}`, body);
  }
  branding(): Observable<Branding> {
    return this.http.get<Branding>(`${this.base}/auth/branding`);
  }
  changeOwnerRole(id: number, role: OwnerRole): Observable<OwnerInfo> {
    return this.http.put<OwnerInfo>(`${this.base}/owners/${id}/role`, { role });
  }
  deleteOwner(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/owners/${id}`);
  }
  resetOwnerPassword(id: number, newPassword: string): Observable<void> {
    return this.http.put<void>(`${this.base}/owners/${id}/password`, { newPassword });
  }
  defaultTax(): Observable<number> {
    return this.http.get<number>(`${this.base}/settings/default-tax`);
  }

  // ----- Settings: event types, packages, studio details -----
  eventTypes(includeInactive = false): Observable<EventTypeInfo[]> {
    return this.http.get<EventTypeInfo[]>(`${this.base}/event-types`, { params: { includeInactive } });
  }
  createEventType(body: SaveEventTypeRequest): Observable<EventTypeInfo> {
    return this.http.post<EventTypeInfo>(`${this.base}/event-types`, body);
  }
  updateEventType(id: number, body: SaveEventTypeRequest): Observable<EventTypeInfo> {
    return this.http.put<EventTypeInfo>(`${this.base}/event-types/${id}`, body);
  }
  deleteEventType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/event-types/${id}`);
  }
  packages(includeInactive = false): Observable<PackageInfo[]> {
    return this.http.get<PackageInfo[]>(`${this.base}/packages`, { params: { includeInactive } });
  }
  createPackage(body: SavePackageRequest): Observable<PackageInfo> {
    return this.http.post<PackageInfo>(`${this.base}/packages`, body);
  }
  updatePackage(id: number, body: SavePackageRequest): Observable<PackageInfo> {
    return this.http.put<PackageInfo>(`${this.base}/packages/${id}`, body);
  }
  deletePackage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/packages/${id}`);
  }
  studio(): Observable<StudioSettings> {
    return this.http.get<StudioSettings>(`${this.base}/settings/studio`);
  }
  updateStudio(body: StudioSettings): Observable<StudioSettings> {
    return this.http.put<StudioSettings>(`${this.base}/settings/studio`, body);
  }

  // ----- Payment ledger -----
  paymentLedger(filter: { from?: string; to?: string; mode?: string } = {}): Observable<PaymentLedgerItem[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) if (value) params = params.set(key, value);
    return this.http.get<PaymentLedgerItem[]>(`${this.base}/payments`, { params });
  }

  // ----- Quotations & invoices -----
  documents(type = ''): Observable<DocumentSummary[]> {
    return this.http.get<DocumentSummary[]>(`${this.base}/documents`, { params: { type } });
  }
  document(id: number): Observable<DocumentDetail> {
    return this.http.get<DocumentDetail>(`${this.base}/documents/${id}`);
  }
  updateDocument(id: number, body: UpdateDocumentRequest): Observable<DocumentDetail> {
    return this.http.put<DocumentDetail>(`${this.base}/documents/${id}`, body);
  }
  createDocument(orderId: number, body: CreateDocumentRequest): Observable<DocumentDetail> {
    return this.http.post<DocumentDetail>(`${this.base}/orders/${orderId}/documents`, body);
  }

  // ----- Login report (SuperAdmin) -----
  loginAudits(filter: LoginReportFilter = {}): Observable<LoginAudit[]> {
    return this.http.get<LoginAudit[]>(`${this.base}/audit/logins`, { params: this.toParams(filter) });
  }
  /** CSV file with the same filters; a blob so the auth interceptor still adds the bearer token. */
  loginAuditsCsv(filter: LoginReportFilter = {}): Observable<Blob> {
    return this.http.get(`${this.base}/audit/logins/export`, { params: this.toParams(filter), responseType: 'blob' });
  }
  private toParams(filter: LoginReportFilter): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) if (value) params = params.set(key, value);
    return params;
  }

  // ----- Studios and roles (SuperAdmin) -----
  studios(): Observable<Studio[]> {
    return this.http.get<Studio[]>(`${this.base}/studios`);
  }
  createStudio(body: CreateStudioRequest): Observable<Studio> {
    return this.http.post<Studio>(`${this.base}/studios`, body);
  }
  updateStudioRecord(id: number, body: UpdateStudioRequest): Observable<Studio> {
    return this.http.put<Studio>(`${this.base}/studios/${id}`, body);
  }
  deleteStudio(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/studios/${id}`);
  }
  roles(): Observable<RoleInfo[]> {
    return this.http.get<RoleInfo[]>(`${this.base}/roles`);
  }
  createRole(body: SaveRoleRequest): Observable<RoleInfo> {
    return this.http.post<RoleInfo>(`${this.base}/roles`, body);
  }
  updateRole(id: number, body: SaveRoleRequest): Observable<RoleInfo> {
    return this.http.put<RoleInfo>(`${this.base}/roles/${id}`, body);
  }
  deleteRole(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/roles/${id}`);
  }

  // ----- Reports -----
  report(from: string, to: string): Observable<DateRangeReport> {
    return this.http.get<DateRangeReport>(`${this.base}/reports`, { params: { from, to } });
  }
  /** Excel workbook for the range; a blob so the auth interceptor still adds the bearer token. */
  reportExcel(from: string, to: string): Observable<Blob> {
    return this.http.get(`${this.base}/reports/export`, { params: { from, to }, responseType: 'blob' });
  }

  // ----- Dashboard -----
  dashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>(`${this.base}/dashboard`);
  }
}

