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
  /** What the client pays for this album (revenue); part of the order total. printCost is the vendor cost. */
  sellingPrice: number;
  packageId: number | null;
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
  taxSplit: TaxSplit;
  taxLines: TaxLine[];
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  /** totalAmount is the photoshoot total; albums are added on top: grandTotal = totalAmount + albumsTotal. */
  albumsTotal: number;
  grandTotal: number;
  albumCost: number;
  /** The parts chosen for the order; packageAmount is their sum. */
  includesPhoto: boolean;
  photoAmount: number;
  includesVideo: boolean;
  videoAmount: number;
  includesAlbum: boolean;
  albumAmount: number;
}

export type LoginEventType = 'Login' | 'Logout' | 'LoginFailed';

export interface LoginAudit {
  auditId: number;
  studioId: number | null;
  studioName: string | null;
  username: string;
  eventType: LoginEventType;
  occurredAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface MonthlyFinance {
  month: string;
  revenue: number;
  expenses: number;
}

export interface DueBalance {
  orderId: number;
  orderNumber: string;
  clientName: string;
  phone: string | null;
  whatsAppNo: string | null;
  eventDate: string;
  orderStatus: OrderStatus;
  balanceDue: number;
}

export interface AlbumStageCount {
  stage: AlbumStage;
  count: number;
}

export interface Dashboard {
  upcomingShootCount: number;
  upcomingShoots: OrderSummary[];
  completedShoots: OrderSummary[];
  pendingClientBalance: number;
  ordersWithBalance: number;
  albumsAwaitingAction: number;
  monthRevenue: number;
  monthExpenses: number;
  lastSixMonths: MonthlyFinance[];
  overdueShoots: OrderSummary[];
  dueBalances: DueBalance[];
  dueBalanceCount: number;
  dueBalanceTotal: number;
  albumsByStage: AlbumStageCount[];
}

/** A role name from the Roles master table (SuperAdmin, Owner, Staff, or a custom role). */
export type OwnerRole = string;
export const SUPER_ADMIN = 'SuperAdmin';
/** Every permission, grouped for the owner editor. Keys match BoscoStudio/Application/Common/AppPermissions.cs. */
export interface PermissionInfo { key: string; label: string }
export const PERMISSION_GROUPS: { title: string; items: PermissionInfo[] }[] = [
  { title: 'Orders', items: [
    { key: 'orders.edit', label: 'Create and edit orders, change status' },
    { key: 'orders.delete', label: 'Delete orders' },
  ] },
  { title: 'Payments', items: [
    { key: 'payments.record', label: 'Record payments and expenses' },
    { key: 'payments.delete', label: 'Delete payments and expenses' },
  ] },
  { title: 'Albums', items: [
    { key: 'albums.edit', label: 'Create and edit albums' },
    { key: 'albums.delete', label: 'Delete albums' },
  ] },
  { title: 'Clients', items: [
    { key: 'clients.edit', label: 'Add and edit clients' },
    { key: 'clients.delete', label: 'Delete clients' },
  ] },
  { title: 'Quotations & invoices', items: [{ key: 'documents.manage', label: 'Create and edit quotations and invoices' }] },
  { title: 'Administration', items: [
    { key: 'settings.manage', label: 'Settings: studio details, event types, packages' },
    { key: 'owners.manage', label: 'Studio logins (owner / staff) and their permissions' },
  ] },
];


export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
  fullName: string;
  role: OwnerRole;
  /** What this owner may do (see PERMISSION_GROUPS). */
  permissions: string[];
  /** The studio this login belongs to; null for the SuperAdmin (who picks a studio to work in). */
  studioId: number | null;
  studioName: string | null;
}

/** A client studio (SuperAdmin). */
export interface Studio {
  studioId: number;
  studioName: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
  orderCount: number;
}

/** A new studio together with its first Owner login. */
export interface CreateStudioRequest {
  studioName: string;
  ownerUsername: string;
  ownerFullName: string;
  ownerEmail: string | null;
  ownerPassword: string;
}

export interface UpdateStudioRequest {
  studioName: string;
  isActive: boolean;
}

/** Role master row: the permissions a new login with this role starts with. */
export interface RoleInfo {
  roleId: number;
  roleName: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  /** null = a shared role (only the SuperAdmin changes it); a number = that studio's own role. */
  studioId: number | null;
}

export interface SaveRoleRequest {
  roleName: string;
  description: string | null;
  permissions: string[];
  /** SuperAdmin only: a role for the studio in scope (true) or a shared one (false). */
  forThisStudio?: boolean;
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
  sellingPrice: number;
  packageId: number | null;
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
  /** Tick the parts being bought; an amount of null = the selected package's price for that part. */
  includePhoto: boolean;
  photoAmount: number | null;
  includeVideo: boolean;
  videoAmount: number | null;
  includeAlbum: boolean;
  albumAmount: number | null;
  discountAmount: number;
  taxPercent: number | null;
  taxSplit: TaxSplit;
  /** CGST rate when split (SGST = taxPercent - cgstPercent). */
  cgstPercent?: number | null;
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
  /** Price of each part; null = the part is not in this package. basePrice is their sum. */
  photoPrice: number | null;
  videoPrice: number | null;
  albumPrice: number | null;
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
  /** Price of each part in the package; null = not included. At least one is required. */
  photoPrice: number | null;
  videoPrice: number | null;
  albumPrice: number | null;
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

export interface DocumentLineRequest {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface UpdateDocumentRequest {
  dueDate: string | null;
  notes: string | null;
  terms: string | null;
  /** Omit to keep the current items. Their total becomes the order's package amount. */
  lines?: DocumentLineRequest[];
  /** Omit to keep. Discount and tax % are written through to the order, so every document of it shows the same figures. */
  discountAmount?: number;
  taxPercent?: number;
  /** Display only: the total is the same either way. */
  taxSplit?: TaxSplit;
  /** CGST rate when split (SGST = taxPercent - cgstPercent). */
  cgstPercent?: number | null;
}

// ---------- Owner accounts ----------

export interface OwnerInfo {
  ownerId: number;
  username: string;
  fullName: string;
  email: string | null;
  role: OwnerRole;
  createdAt: string;
  isCurrent: boolean;
  permissions: string[];
  studioId: number | null;
  studioName: string | null;
}

export interface CreateOwnerRequest {
  username: string;
  fullName: string;
  email: string | null;
  password: string;
  role: OwnerRole;
}

export interface UpdateProfileRequest {
  username: string;
  fullName: string;
  email: string | null;
  currentPassword: string;
}

/** Client with the number of orders (Clients screen). */
export interface ClientRecord extends Client {
  notes: string | null;
  orderCount: number;
}

export interface SaveClientRequest {
  fullName: string;
  phone: string;
  whatsAppNo: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export type TaxSplit = 'Single' | 'CGST+SGST';

/** One printed tax line: "Tax 18%", or "CGST 9%" + "SGST 9%" when split. */
export interface TaxLine {
  label: string;
  percent: number;
  amount: number;
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
  taxSplit: TaxSplit;
  taxLines: TaxLine[];
  /** Albums sold on top of the photoshoot; total / balanceDue below already include them via grandTotal. */
  albumLines: DocumentLine[];
  albumsTotal: number;
  grandTotal: number;
}

export interface CreateDocumentRequest {
  documentType: DocumentType;
  dueDate: string | null;
  notes: string | null;
  terms: string | null;
}

/** Admin editing another owner; a blank newPassword keeps the current one. */
export interface UpdateOwnerRequest {
  username: string;
  fullName: string;
  email: string | null;
  newPassword: string | null;
  /** Omit (or null) to leave unchanged; ignored for Admins. */
  permissions?: string[] | null;
}

/** Shown on the sign-in page. */
export interface Branding {
  studioName: string;
  tagline: string | null;
}

// ----- Date range report -----
export interface ReportPaymentRow {
  paymentDate: string;
  orderNumber: string;
  clientName: string;
  paymentType: PaymentType;
  paymentMode: PaymentMode;
  amount: number;
  transactionRef: string | null;
}

export interface ReportExpenseRow {
  expenseDate: string;
  source: 'Order' | 'Album print';
  orderNumber: string;
  category: string;
  description: string | null;
  amount: number;
}

/** An order in the report: the usual summary plus its total expenses (order expenses + album printing). */
export interface ReportOrderRow extends OrderSummary {
  expenses: number;
}

export interface DateRangeReport {
  from: string;
  to: string;
  orderCount: number;
  ordersTotal: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  orders: ReportOrderRow[];
  payments: ReportPaymentRow[];
  expenseRows: ReportExpenseRow[];
  activity: OrderActivityRow[];
}

/** Who created an order and who last changed it (times are UTC). Shown on the Reports page only. */
export interface OrderActivityRow {
  orderId: number;
  orderNumber: string;
  clientName: string;
  orderStatus: OrderStatus;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}
