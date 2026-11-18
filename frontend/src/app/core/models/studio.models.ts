// Mirrors BoscoStudio/Application/Dtos/*.cs. DateOnly -> 'yyyy-MM-dd', TimeOnly -> 'HH:mm:ss', DateTime -> ISO string.

export const ORDER_STATUSES = [
  'Pre-Order', 'Pending', 'Confirmed', 'Shoot Completed', 'In Post-Production', 'Delivered', 'Cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ALBUM_STAGES = [
  'Photo Selection Pending', 'Sheet Designing', 'Client Proofing',
  'Sent to Print Lab', 'Album Received', 'Handed Over to Client',
] as const;
export type AlbumStage = (typeof ALBUM_STAGES)[number];

export const PAYMENT_TYPES = ['Booking Advance', 'Shoot-Day Payment', 'Final Delivery Balance', 'Other'] as const;
export const PAYMENT_MODES = ['UPI', 'Bank Transfer', 'Cash', 'Card', 'Cheque'] as const;
export const EXPENSE_CATEGORIES = [
  'Second Shooter', 'Equipment Rental', 'Travel / Fuel', 'Print Lab', 'Assistant', 'Food / Stay', 'Other',
] as const;
export const WORK_STATUSES = ['Not Started', 'In Progress', 'Completed'] as const;

export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type PaymentMode = (typeof PAYMENT_MODES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type WorkStatus = (typeof WORK_STATUSES)[number];

// ---------- Responses ----------

export interface Client {
  clientId: number;
  fullName: string;
  phone: string;
  whatsAppNo: string | null;
  email: string | null;
  address: string | null;
}

export interface EventSlot {
  slotId: number | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  title: string | null;
  venue: string | null;
}

export interface OrderSummary {
  orderId: number;
  orderNumber: string;
  clientName: string;
  clientPhone: string | null;
  eventType: string;
  orderStatus: OrderStatus;
  eventDate: string;
  venue: string | null;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
}

export interface CalendarItem {
  orderId: number;
  orderNumber: string;
  clientName: string;
  eventType: string;
  orderStatus: OrderStatus;
  eventDate: string;
  startTime: string;
  endTime: string;
  title: string | null;
  venue: string | null;
}

export interface Payment {
  paymentId: number;
  orderId: number;
  paymentType: PaymentType;
  paymentMode: PaymentMode;
  amount: number;
  paymentDate: string;
  transactionRef: string | null;
  notes: string | null;
}

export interface Expense {
  expenseId: number;
  orderId: number;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expenseDate: string;
}

export interface Deliverable {
  orderId: number;
  rawBackupStatus: WorkStatus;
  selectionMode: 'Client Selection' | 'Studio Selection';
  selectionStatus: WorkStatus;
  photoEditStatus: WorkStatus;
  teaserEditStatus: WorkStatus;
  fullFilmEditStatus: WorkStatus;
  cloudProvider: 'Google Drive' | 'WeTransfer' | 'Dropbox' | 'Other' | null;
  cloudLink: string | null;
  deliveredOn: string | null;
}

export interface Album {
  albumId: number;
  orderId: number;
  orderNumber: string | null;
  clientName: string | null;
  albumType: string;
  sheetCount: number;
  albumStage: AlbumStage;
  nextStage: AlbumStage | null;
  printVendorName: string | null;
  printVendorContact: string | null;
  printCost: number | null;
  sentToPrintOn: string | null;
  receivedOn: string | null;
  handedOverOn: string | null;
  notes: string | null;
}

export interface OrderDetail {
  orderId: number;
  orderNumber: string;
  orderStatus: OrderStatus;
  eventType: string;
  eventDate: string;
  venue: string | null;
  notes: string | null;
  createdAt: string;
  client: Client;
  packageId: number | null;
  packageName: string | null;
  packageAmount: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;
  totalPaid: number;
  balanceDue: number;
  totalExpenses: number;
  netProfit: number;
  slots: EventSlot[];
  payments: Payment[];
  expenses: Expense[];
  deliverable: Deliverable | null;
  albums: Album[];
  allowedNextStatuses: OrderStatus[];
  documents: OrderDocumentRef[];
}

export interface MonthlyFinance {
  month: string;
  revenue: number;
  expenses: number;
}

export interface Dashboard {
  upcomingShootCount: number;
  upcomingShoots: OrderSummary[];
  pendingClientBalance: number;
  ordersWithBalance: number;
  albumsAwaitingAction: number;
  monthRevenue: number;
  monthExpenses: number;
  lastSixMonths: MonthlyFinance[];
}

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  fullName: string;
}

// ---------- Requests ----------

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreatePaymentRequest {
  paymentType: PaymentType;
  paymentMode: PaymentMode;
  amount: number;
  paymentDate: string | null;
  transactionRef: string | null;
  notes: string | null;
}

export interface CreateExpenseRequest {
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expenseDate: string | null;
}

export interface CreateAlbumRequest {
  albumType: string;
  sheetCount: number;
  printVendorName: string | null;
  printVendorContact: string | null;
  printCost: number | null;
  notes: string | null;
}
export type UpdateAlbumRequest = CreateAlbumRequest;

export interface EventSlotRequest {
  eventDate: string;
  startTime: string;
  endTime: string;
  title: string | null;
  venue: string | null;
}

export interface NewClientRequest {
  fullName: string;
  phone: string;
  whatsAppNo: string | null;
  email: string | null;
  address: string | null;
}

export interface UpdateOrderRequest {
  packageId: number | null;
  eventType: string;
  venue: string | null;
  notes: string | null;
  packageAmount: number | null;
  discountAmount: number;
  taxPercent: number | null;
  slots: EventSlotRequest[];
  allowOverlap: boolean;
}

export interface CreateOrderRequest extends UpdateOrderRequest {
  clientId: number | null;
  newClient: NewClientRequest | null;
  initialStatus: 'Pre-Order' | 'Pending' | 'Confirmed';
}

export type UpdateDeliverableRequest = Omit<Deliverable, 'orderId'>;

/** RFC 7807 body returned by ExceptionHandlingMiddleware / FluentValidation. */
export interface ApiProblem {
  status: number;
  title: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

// ---------- Lookups, payment ledger, quotations & invoices ----------

export interface PackageInfo {
  packageId: number;
  packageName: string;
  eventType: string | null;
  basePrice: number;
  inclusions: string | null;
  isActive: boolean;
}

/** Owner-managed (Settings > Event types). Orders and packages refer to it by name. */
export interface EventTypeInfo {
  eventTypeId: number;
  eventTypeName: string;
  sortOrder: number;
  isActive: boolean;
  orderCount: number;
  packageCount: number;
}
export interface SaveEventTypeRequest {
  eventTypeName: string;
  sortOrder: number;
  isActive: boolean;
}
export interface SavePackageRequest {
  packageName: string;
  eventType: string | null;
  basePrice: number;
  inclusions: string | null;
  isActive: boolean;
}

/** Printed in the header/footer of every quotation and invoice. */
export interface StudioSettings {
  studioName: string;
  tagline: string | null;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  taxRegistrationNo: string | null;
  defaultTaxPercent: number;
  invoicePrefix: string;
  quotationPrefix: string;
  defaultTerms: string | null;
  bankDetails: string | null;
  logoUrl: string | null;
}

export interface UpdateDocumentRequest {
  dueDate: string | null;
  notes: string | null;
  terms: string | null;
}

export interface OrderDocumentRef {
  documentId: number;
  documentType: 'Quotation' | 'Invoice';
  documentNumber: string;
}

export interface PaymentLedgerItem {
  paymentId: number;
  orderId: number;
  orderNumber: string;
  clientName: string;
  paymentType: PaymentType;
  paymentMode: PaymentMode;
  amount: number;
  paymentDate: string;
  transactionRef: string | null;
}

export type DocumentType = 'Quotation' | 'Invoice';

export interface DocumentSummary {
  documentId: number;
  documentNumber: string;
  documentType: DocumentType;
  orderId: number;
  orderNumber: string;
  clientName: string;
  issueDate: string;
  total: number;
  balanceDue: number;
}

export interface StudioInfo {
  studioName: string;
  tagline: string | null;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  taxRegistrationNo: string | null;
  bankDetails: string | null;
  logoUrl: string | null;
}

export interface DocumentLine {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface DocumentDetail {
  documentId: number;
  documentNumber: string;
  documentType: DocumentType;
  issueDate: string;
  dueDate: string | null;
  terms: string | null;
  notes: string | null;
  studio: StudioInfo;
  client: Client;
  orderId: number;
  orderNumber: string;
  eventType: string;
  eventDate: string;
  venue: string | null;
  lines: DocumentLine[];
  subtotal: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  payments: Payment[];
  totalPaid: number;
  balanceDue: number;
}

export interface CreateDocumentRequest {
  documentType: DocumentType;
  dueDate: string | null;
  notes: string | null;
  terms: string | null;
}
