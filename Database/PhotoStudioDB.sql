/* =====================================================================
   PhotoStudioDB.sql  -  Single-Owner Photography Studio Management
   Target : SQL Server  (Server: MARIALEO)
   Run    : SSMS > connect as sa > open this file > Execute (F5)
   Run once on a fresh server. To start over: DROP DATABASE PhotoStudioDB first.
   Seed owner login:  username = owner   password = Owner@123  (CHANGE IT)
   ===================================================================== */

IF DB_ID(N'PhotoStudioDB') IS NULL
    CREATE DATABASE PhotoStudioDB;
GO
USE PhotoStudioDB;
GO

/* ---------------------------------------------------------------------
   1. OWNER & STUDIO SETTINGS  (both hold exactly one row)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.OwnerAccounts') IS NULL
CREATE TABLE dbo.OwnerAccounts (
    OwnerId        INT IDENTITY(1,1) CONSTRAINT PK_OwnerAccounts PRIMARY KEY,
    Username       NVARCHAR(50)  NOT NULL CONSTRAINT UQ_OwnerAccounts_Username UNIQUE,
    PasswordHash   NVARCHAR(200) NOT NULL,                 -- BCrypt hash, never plain text
    FullName       NVARCHAR(100) NOT NULL,
    Email          NVARCHAR(150) NULL,
    Role           NVARCHAR(10)  NOT NULL CONSTRAINT DF_OwnerAccounts_Role DEFAULT N'Admin'
                       CONSTRAINT CK_OwnerAccounts_Role CHECK (Role IN (N'Admin', N'Manager', N'Staff')),
    -- Comma-separated permissions (orders.edit, orders.delete, ...). NULL = the role's preset. Admins always have everything.
    Permissions    NVARCHAR(500) NULL,
    CreatedAt      DATETIME2(0)  NOT NULL CONSTRAINT DF_OwnerAccounts_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO

-- Sign-in history (successful logins, failed attempts, logouts). No FK: history survives a deleted owner.
IF OBJECT_ID(N'dbo.LoginAudits') IS NULL
BEGIN
    CREATE TABLE dbo.LoginAudits (
        AuditId     BIGINT IDENTITY(1,1) CONSTRAINT PK_LoginAudits PRIMARY KEY,
        OwnerId     INT           NULL,
        Username    NVARCHAR(50)  NOT NULL,
        EventType   NVARCHAR(12)  NOT NULL CONSTRAINT CK_LoginAudits_Event CHECK (EventType IN (N'Login', N'Logout', N'LoginFailed')),
        OccurredAt  DATETIME2(0)  NOT NULL CONSTRAINT DF_LoginAudits_At DEFAULT SYSUTCDATETIME(),
        IpAddress   NVARCHAR(45)  NULL,
        UserAgent   NVARCHAR(300) NULL
    );
    CREATE INDEX IX_LoginAudits_OccurredAt ON dbo.LoginAudits (OccurredAt DESC) INCLUDE (Username, EventType);
    CREATE INDEX IX_LoginAudits_OwnerId    ON dbo.LoginAudits (OwnerId, OccurredAt DESC);
END
GO

IF OBJECT_ID(N'dbo.StudioSettings') IS NULL
CREATE TABLE dbo.StudioSettings (
    StudioSettingsId   INT           NOT NULL CONSTRAINT PK_StudioSettings PRIMARY KEY
                                     CONSTRAINT CK_StudioSettings_SingleRow CHECK (StudioSettingsId = 1),
    StudioName         NVARCHAR(150) NOT NULL,
    Tagline            NVARCHAR(200) NULL,
    AddressLine        NVARCHAR(300) NULL,
    Phone              NVARCHAR(30)  NULL,
    Email              NVARCHAR(150) NULL,
    TaxRegistrationNo  NVARCHAR(50)  NULL,                 -- GST / VAT number
    DefaultTaxPercent  DECIMAL(5,2)  NOT NULL CONSTRAINT DF_StudioSettings_Tax DEFAULT 0
                                     CONSTRAINT CK_StudioSettings_Tax CHECK (DefaultTaxPercent BETWEEN 0 AND 100),
    InvoicePrefix      NVARCHAR(10)  NOT NULL CONSTRAINT DF_StudioSettings_InvPrefix DEFAULT N'INV',
    QuotationPrefix    NVARCHAR(10)  NOT NULL CONSTRAINT DF_StudioSettings_QtPrefix  DEFAULT N'QTN',
    DefaultTerms       NVARCHAR(MAX) NULL,
    BankDetails        NVARCHAR(500) NULL,
    LogoUrl            NVARCHAR(300) NULL
);
GO

/* ---------------------------------------------------------------------
   2. CLIENTS & PACKAGES
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Clients') IS NULL
CREATE TABLE dbo.Clients (
    ClientId     INT IDENTITY(1,1) CONSTRAINT PK_Clients PRIMARY KEY,
    FullName     NVARCHAR(120) NOT NULL,
    Phone        NVARCHAR(30)  NOT NULL,
    WhatsAppNo   NVARCHAR(30)  NULL,
    Email        NVARCHAR(150) NULL,
    Address      NVARCHAR(300) NULL,
    Notes        NVARCHAR(500) NULL,
    CreatedAt    DATETIME2(0)  NOT NULL CONSTRAINT DF_Clients_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Clients_FullName ON dbo.Clients (FullName);
CREATE INDEX IX_Clients_Phone    ON dbo.Clients (Phone);
GO

-- Owner-managed list of event types (Settings > Event types). Orders and Packages reference it by name.
IF OBJECT_ID(N'dbo.EventTypes') IS NULL
CREATE TABLE dbo.EventTypes (
    EventTypeId    INT IDENTITY(1,1) CONSTRAINT PK_EventTypes PRIMARY KEY,
    EventTypeName  NVARCHAR(30) NOT NULL CONSTRAINT UQ_EventTypes_Name UNIQUE,
    SortOrder      INT          NOT NULL CONSTRAINT DF_EventTypes_Sort DEFAULT 0,
    IsActive       BIT          NOT NULL CONSTRAINT DF_EventTypes_Active DEFAULT 1
);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.EventTypes)
    INSERT dbo.EventTypes (EventTypeName, SortOrder) VALUES
    (N'Wedding',1),(N'Pre-Wedding',2),(N'Engagement',3),(N'Maternity',4),(N'Newborn',5),
    (N'Birthday',6),(N'Corporate',7),(N'Portrait',8),(N'Product',9),(N'Other',10);
GO

IF OBJECT_ID(N'dbo.Packages') IS NULL
CREATE TABLE dbo.Packages (
    PackageId    INT IDENTITY(1,1) CONSTRAINT PK_Packages PRIMARY KEY,
    PackageName  NVARCHAR(120) NOT NULL CONSTRAINT UQ_Packages_Name UNIQUE,
    EventType    NVARCHAR(30)  NULL CONSTRAINT FK_Packages_EventTypes REFERENCES dbo.EventTypes(EventTypeName) ON UPDATE CASCADE,
    BasePrice    DECIMAL(12,2) NOT NULL CONSTRAINT CK_Packages_Price CHECK (BasePrice >= 0),
    Inclusions   NVARCHAR(1000) NULL,
    IsActive     BIT           NOT NULL CONSTRAINT DF_Packages_IsActive DEFAULT 1,
    -- A package is a bundle of up to three parts, each with its own price. NULL = that part is not in the package.
    -- BasePrice = the sum of the parts that are in it (kept by CatalogService).
    PhotoPrice   DECIMAL(12,2) NULL,
    VideoPrice   DECIMAL(12,2) NULL,
    AlbumPrice   DECIMAL(12,2) NULL,
    CONSTRAINT CK_Packages_Parts CHECK ((PhotoPrice IS NULL OR PhotoPrice >= 0) AND (VideoPrice IS NULL OR VideoPrice >= 0) AND (AlbumPrice IS NULL OR AlbumPrice >= 0))
);
GO

/* ---------------------------------------------------------------------
   3. ORDERS (one booking = one order)
      TaxAmount / TotalAmount are computed columns => always consistent.
      EventDate = first shoot date (kept in sync by OrderService); the
      full multi-day / multi-slot schedule lives in OrderEventSlots.
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Orders') IS NULL
CREATE TABLE dbo.Orders (
    OrderId        INT IDENTITY(1,1) CONSTRAINT PK_Orders PRIMARY KEY,
    OrderNumber    NVARCHAR(20)  NOT NULL CONSTRAINT UQ_Orders_OrderNumber UNIQUE,   -- e.g. ORD-2026-0001
    ClientId       INT           NOT NULL CONSTRAINT FK_Orders_Clients  REFERENCES dbo.Clients(ClientId),
    PackageId      INT           NULL     CONSTRAINT FK_Orders_Packages REFERENCES dbo.Packages(PackageId),
    EventType      NVARCHAR(30)  NOT NULL CONSTRAINT FK_Orders_EventTypes REFERENCES dbo.EventTypes(EventTypeName) ON UPDATE CASCADE,
    OrderStatus    NVARCHAR(30)  NOT NULL CONSTRAINT DF_Orders_Status DEFAULT N'Pre-Order'
        CONSTRAINT CK_Orders_Status CHECK (OrderStatus IN
            (N'Pre-Order',N'Pending',N'Confirmed',N'Shoot Completed',
             N'In Post-Production',N'Delivered',N'Cancelled')),
    EventDate      DATE          NOT NULL,
    Venue          NVARCHAR(300) NULL,
    Notes          NVARCHAR(1000) NULL,
    -- PackageAmount = the sum of the parts chosen for this order (Photo / Video / Album), kept by OrderService.
    IncludesPhoto  BIT           NOT NULL CONSTRAINT DF_Orders_InclPhoto DEFAULT 1,
    IncludesVideo  BIT           NOT NULL CONSTRAINT DF_Orders_InclVideo DEFAULT 0,
    IncludesAlbum  BIT           NOT NULL CONSTRAINT DF_Orders_InclAlbum DEFAULT 0,
    PhotoAmount    DECIMAL(12,2) NOT NULL CONSTRAINT DF_Orders_PhotoAmt DEFAULT 0,
    VideoAmount    DECIMAL(12,2) NOT NULL CONSTRAINT DF_Orders_VideoAmt DEFAULT 0,
    AlbumAmount    DECIMAL(12,2) NOT NULL CONSTRAINT DF_Orders_AlbumAmt DEFAULT 0,
    PackageAmount  DECIMAL(12,2) NOT NULL CONSTRAINT DF_Orders_PkgAmt  DEFAULT 0 CONSTRAINT CK_Orders_PkgAmt  CHECK (PackageAmount >= 0),
    DiscountAmount DECIMAL(12,2) NOT NULL CONSTRAINT DF_Orders_Disc    DEFAULT 0 CONSTRAINT CK_Orders_Disc    CHECK (DiscountAmount >= 0),
    TaxPercent     DECIMAL(5,2)  NOT NULL CONSTRAINT DF_Orders_TaxPct  DEFAULT 0 CONSTRAINT CK_Orders_TaxPct  CHECK (TaxPercent BETWEEN 0 AND 100),
    -- How the tax is shown on documents: one line, or split into CGST + SGST. The total never changes.
    -- TaxPercent is always the TOTAL rate; with a split, CgstPercent is the CGST part and SGST is the rest (NULL = equal halves).
    TaxSplit       NVARCHAR(12)  NOT NULL CONSTRAINT DF_Orders_TaxSplit DEFAULT N'Single'
                       CONSTRAINT CK_Orders_TaxSplit CHECK (TaxSplit IN (N'Single', N'CGST+SGST')),
    CgstPercent    DECIMAL(5,2)  NULL CONSTRAINT CK_Orders_CgstPct CHECK (CgstPercent IS NULL OR (CgstPercent >= 0 AND CgstPercent <= TaxPercent)),
    TaxAmount      AS CAST(ROUND((PackageAmount - DiscountAmount) * TaxPercent / 100.0, 2) AS DECIMAL(12,2)) PERSISTED,
    TotalAmount    AS CAST((PackageAmount - DiscountAmount)
                          + ROUND((PackageAmount - DiscountAmount) * TaxPercent / 100.0, 2) AS DECIMAL(12,2)) PERSISTED,
    CreatedAt      DATETIME2(0)  NOT NULL CONSTRAINT DF_Orders_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt      DATETIME2(0)  NULL,
    CreatedBy      NVARCHAR(50)  NULL,                      -- username of the owner who created / last changed the order
    UpdatedBy      NVARCHAR(50)  NULL,
    CONSTRAINT CK_Orders_DiscountLimit CHECK (DiscountAmount <= PackageAmount)
);
CREATE INDEX IX_Orders_EventDate   ON dbo.Orders (EventDate)   INCLUDE (OrderStatus, ClientId);
CREATE INDEX IX_Orders_OrderStatus ON dbo.Orders (OrderStatus) INCLUDE (EventDate, TotalAmount);
CREATE INDEX IX_Orders_ClientId    ON dbo.Orders (ClientId);
GO

IF OBJECT_ID(N'dbo.OrderEventSlots') IS NULL
CREATE TABLE dbo.OrderEventSlots (
    SlotId      INT IDENTITY(1,1) CONSTRAINT PK_OrderEventSlots PRIMARY KEY,
    OrderId     INT           NOT NULL CONSTRAINT FK_OrderEventSlots_Orders REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE,
    EventDate   DATE          NOT NULL,
    StartTime   TIME(0)       NOT NULL,
    EndTime     TIME(0)       NOT NULL,
    Title       NVARCHAR(100) NULL,                        -- e.g. "Haldi", "Reception"
    Venue       NVARCHAR(300) NULL,
    CONSTRAINT CK_OrderEventSlots_Time CHECK (EndTime > StartTime)
);
CREATE INDEX IX_OrderEventSlots_EventDate ON dbo.OrderEventSlots (EventDate, StartTime) INCLUDE (EndTime, OrderId);
CREATE INDEX IX_OrderEventSlots_OrderId   ON dbo.OrderEventSlots (OrderId);
GO

/* ---------------------------------------------------------------------
   4. PAYMENTS & EXPENSES
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Payments') IS NULL
CREATE TABLE dbo.Payments (
    PaymentId      INT IDENTITY(1,1) CONSTRAINT PK_Payments PRIMARY KEY,
    OrderId        INT           NOT NULL CONSTRAINT FK_Payments_Orders REFERENCES dbo.Orders(OrderId),
    PaymentType    NVARCHAR(30)  NOT NULL
        CONSTRAINT CK_Payments_Type CHECK (PaymentType IN
            (N'Booking Advance',N'Shoot-Day Payment',N'Final Delivery Balance',N'Other')),
    PaymentMode    NVARCHAR(20)  NOT NULL
        CONSTRAINT CK_Payments_Mode CHECK (PaymentMode IN (N'UPI',N'Bank Transfer',N'Cash',N'Card',N'Cheque')),
    Amount         DECIMAL(12,2) NOT NULL CONSTRAINT CK_Payments_Amount CHECK (Amount > 0),
    PaymentDate    DATE          NOT NULL CONSTRAINT DF_Payments_Date DEFAULT CAST(SYSUTCDATETIME() AS DATE),
    TransactionRef NVARCHAR(100) NULL,
    Notes          NVARCHAR(300) NULL,
    CreatedAt      DATETIME2(0)  NOT NULL CONSTRAINT DF_Payments_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Payments_OrderId     ON dbo.Payments (OrderId) INCLUDE (Amount);
CREATE INDEX IX_Payments_PaymentDate ON dbo.Payments (PaymentDate) INCLUDE (Amount);
GO

IF OBJECT_ID(N'dbo.Expenses') IS NULL
CREATE TABLE dbo.Expenses (
    ExpenseId    INT IDENTITY(1,1) CONSTRAINT PK_Expenses PRIMARY KEY,
    OrderId      INT           NOT NULL CONSTRAINT FK_Expenses_Orders REFERENCES dbo.Orders(OrderId),
    Category     NVARCHAR(30)  NOT NULL
        CONSTRAINT CK_Expenses_Category CHECK (Category IN
            (N'Second Shooter',N'Equipment Rental',N'Travel / Fuel',N'Print Lab',N'Assistant',N'Food / Stay',N'Other')),
    Description  NVARCHAR(300) NULL,
    Amount       DECIMAL(12,2) NOT NULL CONSTRAINT CK_Expenses_Amount CHECK (Amount > 0),
    ExpenseDate  DATE          NOT NULL CONSTRAINT DF_Expenses_Date DEFAULT CAST(SYSUTCDATETIME() AS DATE),
    CreatedAt    DATETIME2(0)  NOT NULL CONSTRAINT DF_Expenses_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Expenses_OrderId     ON dbo.Expenses (OrderId) INCLUDE (Amount);
CREATE INDEX IX_Expenses_ExpenseDate ON dbo.Expenses (ExpenseDate) INCLUDE (Amount);
GO

/* ---------------------------------------------------------------------
   5. POST-PRODUCTION: DELIVERABLES (1 per order) & ALBUMS (0..n per order)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.Deliverables') IS NULL
CREATE TABLE dbo.Deliverables (
    DeliverableId       INT IDENTITY(1,1) CONSTRAINT PK_Deliverables PRIMARY KEY,
    OrderId             INT NOT NULL CONSTRAINT UQ_Deliverables_Order UNIQUE
                            CONSTRAINT FK_Deliverables_Orders REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE,
    SelectionMode       NVARCHAR(20) NOT NULL CONSTRAINT DF_Deliv_SelMode DEFAULT N'Client Selection'
        CONSTRAINT CK_Deliv_SelMode CHECK (SelectionMode IN (N'Client Selection',N'Studio Selection')),
    SelectionStatus     NVARCHAR(20) NOT NULL CONSTRAINT DF_Deliv_Sel   DEFAULT N'Not Started'
        CONSTRAINT CK_Deliv_Sel   CHECK (SelectionStatus   IN (N'Not Started',N'In Progress',N'Completed')),
    PhotoEditStatus     NVARCHAR(20) NOT NULL CONSTRAINT DF_Deliv_Photo DEFAULT N'Not Started'
        CONSTRAINT CK_Deliv_Photo CHECK (PhotoEditStatus   IN (N'Not Started',N'In Progress',N'Completed')),
    TeaserEditStatus    NVARCHAR(20) NOT NULL CONSTRAINT DF_Deliv_Teaser DEFAULT N'Not Started'
        CONSTRAINT CK_Deliv_Teaser CHECK (TeaserEditStatus IN (N'Not Started',N'In Progress',N'Completed')),
    FullFilmEditStatus  NVARCHAR(20) NOT NULL CONSTRAINT DF_Deliv_Film  DEFAULT N'Not Started'
        CONSTRAINT CK_Deliv_Film  CHECK (FullFilmEditStatus IN (N'Not Started',N'In Progress',N'Completed')),
    CloudProvider       NVARCHAR(20) NULL
        CONSTRAINT CK_Deliv_Provider CHECK (CloudProvider IN (N'Google Drive',N'WeTransfer',N'Dropbox',N'Other')),
    CloudLink           NVARCHAR(500) NULL,
    DeliveredOn         DATE NULL,
    UpdatedAt           DATETIME2(0) NULL
);
GO

IF OBJECT_ID(N'dbo.Albums') IS NULL
CREATE TABLE dbo.Albums (
    AlbumId        INT IDENTITY(1,1) CONSTRAINT PK_Albums PRIMARY KEY,
    OrderId        INT NOT NULL CONSTRAINT FK_Albums_Orders REFERENCES dbo.Orders(OrderId) ON DELETE CASCADE,
    AlbumType      NVARCHAR(60)  NOT NULL,                  -- e.g. "Premium Flush Mount 12x36"
    SheetCount     INT           NOT NULL CONSTRAINT CK_Albums_Sheets CHECK (SheetCount > 0),
    AlbumStage     NVARCHAR(30)  NOT NULL CONSTRAINT DF_Albums_Stage DEFAULT N'Photo Selection Pending'
        CONSTRAINT CK_Albums_Stage CHECK (AlbumStage IN
            (N'Photo Selection Pending',N'Sheet Designing',N'Client Proofing',
             N'Sent to Print Lab',N'Album Received',N'Handed Over to Client')),
    PrintVendorName    NVARCHAR(120) NULL,
    PrintVendorContact NVARCHAR(60)  NULL,
    SellingPrice       DECIMAL(12,2) NOT NULL CONSTRAINT DF_Albums_SellingPrice DEFAULT 0 CONSTRAINT CK_Albums_SellingPrice CHECK (SellingPrice >= 0),  -- what the client pays (revenue, tax included)
    PackageId          INT NULL CONSTRAINT FK_Albums_Packages REFERENCES dbo.Packages(PackageId),                                                     -- album package it was sold from
    PrintCost          DECIMAL(12,2) NULL CONSTRAINT CK_Albums_Cost CHECK (PrintCost >= 0),                                                           -- what the print vendor charges us (cost)
    SentToPrintOn      DATE NULL,
    ReceivedOn         DATE NULL,
    HandedOverOn       DATE NULL,
    Notes              NVARCHAR(500) NULL,
    CreatedAt          DATETIME2(0) NOT NULL CONSTRAINT DF_Albums_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt          DATETIME2(0) NULL
);
CREATE INDEX IX_Albums_OrderId    ON dbo.Albums (OrderId);
CREATE INDEX IX_Albums_AlbumStage ON dbo.Albums (AlbumStage);
GO

/* ---------------------------------------------------------------------
   6. QUOTATIONS & INVOICES  (numbers: INV-2026-001 via DocumentSequences)
   --------------------------------------------------------------------- */
IF OBJECT_ID(N'dbo.DocumentSequences') IS NULL
CREATE TABLE dbo.DocumentSequences (
    DocumentType NVARCHAR(10) NOT NULL,                     -- 'INV' / 'QTN' (the prefix)
    SeqYear      INT          NOT NULL,
    LastNumber   INT          NOT NULL CONSTRAINT DF_DocSeq_Last DEFAULT 0,
    CONSTRAINT PK_DocumentSequences PRIMARY KEY (DocumentType, SeqYear)
);
GO

IF OBJECT_ID(N'dbo.Documents') IS NULL
CREATE TABLE dbo.Documents (
    DocumentId     INT IDENTITY(1,1) CONSTRAINT PK_Documents PRIMARY KEY,
    OrderId        INT           NOT NULL CONSTRAINT FK_Documents_Orders REFERENCES dbo.Orders(OrderId),
    DocumentType   NVARCHAR(15)  NOT NULL CONSTRAINT CK_Documents_Type CHECK (DocumentType IN (N'Quotation',N'Invoice')),
    DocumentNumber NVARCHAR(30)  NOT NULL CONSTRAINT UQ_Documents_Number UNIQUE,
    IssueDate      DATE          NOT NULL CONSTRAINT DF_Documents_Issue DEFAULT CAST(SYSUTCDATETIME() AS DATE),
    DueDate        DATE          NULL,
    Terms          NVARCHAR(MAX) NULL,                        -- snapshot of T&C at issue time
    Notes          NVARCHAR(500) NULL,
    CreatedAt      DATETIME2(0)  NOT NULL CONSTRAINT DF_Documents_CreatedAt DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Documents_OrderId ON dbo.Documents (OrderId);
-- One quotation and one invoice per order: edit the existing document instead of creating another.
CREATE UNIQUE INDEX UX_Documents_OrderId_Type ON dbo.Documents (OrderId, DocumentType);
GO

IF OBJECT_ID(N'dbo.DocumentLines') IS NULL
CREATE TABLE dbo.DocumentLines (
    LineId       INT IDENTITY(1,1) CONSTRAINT PK_DocumentLines PRIMARY KEY,
    DocumentId   INT           NOT NULL CONSTRAINT FK_DocumentLines_Documents REFERENCES dbo.Documents(DocumentId) ON DELETE CASCADE,
    Description  NVARCHAR(300) NOT NULL,
    Quantity     DECIMAL(9,2)  NOT NULL CONSTRAINT DF_DocLines_Qty DEFAULT 1 CONSTRAINT CK_DocLines_Qty CHECK (Quantity > 0),
    UnitPrice    DECIMAL(12,2) NOT NULL CONSTRAINT CK_DocLines_Price CHECK (UnitPrice >= 0),
    LineTotal    AS CAST(Quantity * UnitPrice AS DECIMAL(12,2)) PERSISTED
);
CREATE INDEX IX_DocumentLines_DocumentId ON dbo.DocumentLines (DocumentId);
GO

/* ---------------------------------------------------------------------
   7. STORED PROCEDURE: atomic, gap-free next document number
   --------------------------------------------------------------------- */
CREATE OR ALTER PROCEDURE dbo.usp_GetNextDocumentNumber
    @Prefix     NVARCHAR(10),
    @Year       INT,
    @NextNumber INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
        UPDATE dbo.DocumentSequences WITH (UPDLOCK, HOLDLOCK)
           SET LastNumber = LastNumber + 1, @NextNumber = LastNumber + 1
         WHERE DocumentType = @Prefix AND SeqYear = @Year;

        IF @@ROWCOUNT = 0
        BEGIN
            INSERT dbo.DocumentSequences (DocumentType, SeqYear, LastNumber) VALUES (@Prefix, @Year, 1);
            SET @NextNumber = 1;
        END
    COMMIT;
END
GO

/* ---------------------------------------------------------------------
   8. SEED DATA
   --------------------------------------------------------------------- */
IF NOT EXISTS (SELECT 1 FROM dbo.OwnerAccounts)
    INSERT dbo.OwnerAccounts (Username, PasswordHash, FullName, Email)
    VALUES (N'owner', N'$2a$11$gYvBkSu1PtbHnnCCa2/oF.4Vn98BiWLXMU82ci146mzkxF7aAy8j.', N'Studio Owner', N'owner@boscostudio.local');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.StudioSettings)
    INSERT dbo.StudioSettings (StudioSettingsId, StudioName, Tagline, AddressLine, Phone, Email, TaxRegistrationNo,
                               DefaultTaxPercent, DefaultTerms, BankDetails)
    VALUES (1, N'Bosco Studio', N'Moments, beautifully kept', N'Your studio address here', N'+91 00000 00000',
            N'hello@boscostudio.local', NULL, 0,
            N'1. 30% advance is required to block the date and is non-refundable.' + CHAR(10) +
            N'2. Balance is due on the shoot day / before final delivery.' + CHAR(10) +
            N'3. Edited files are delivered within the agreed timeline after photo selection.' + CHAR(10) +
            N'4. Raw files are not shared unless agreed in writing.',
            N'Account name / bank / account no. / IFSC / UPI id');
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Packages)
    INSERT dbo.Packages (PackageName, EventType, BasePrice, Inclusions) VALUES
    (N'Wedding Silver',   N'Wedding',     75000, N'1 photographer, 1 videographer, 1 album (30 sheets), cloud delivery'),
    (N'Wedding Gold',     N'Wedding',    125000, N'2 photographers, 2 videographers, 2 albums, teaser + full film'),
    (N'Pre-Wedding Shoot',N'Pre-Wedding', 30000, N'Half-day outdoor shoot, 40 edited photos, teaser'),
    (N'Maternity Studio', N'Maternity',   12000, N'Studio session, 20 edited photos'),
    (N'Corporate Day',    N'Corporate',   20000, N'Full-day coverage, 100 edited photos');
GO

