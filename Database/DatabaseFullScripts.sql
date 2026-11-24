
/****** Object:  Table [dbo].[Albums]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Albums](
	[AlbumId] [int] IDENTITY(1,1) NOT NULL,
	[OrderId] [int] NOT NULL,
	[AlbumType] [nvarchar](60) NOT NULL,
	[SheetCount] [int] NOT NULL,
	[AlbumStage] [nvarchar](30) NOT NULL,
	[PrintVendorName] [nvarchar](120) NULL,
	[PrintVendorContact] [nvarchar](60) NULL,
	[PrintCost] [decimal](12, 2) NULL,
	[SentToPrintOn] [date] NULL,
	[ReceivedOn] [date] NULL,
	[HandedOverOn] [date] NULL,
	[Notes] [nvarchar](500) NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[UpdatedAt] [datetime2](0) NULL,
	[SellingPrice] [decimal](12, 2) NOT NULL,
	[PackageId] [int] NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_Albums] PRIMARY KEY CLUSTERED 
(
	[AlbumId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Clients]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Clients](
	[ClientId] [int] IDENTITY(1,1) NOT NULL,
	[FullName] [nvarchar](120) NOT NULL,
	[Phone] [nvarchar](30) NOT NULL,
	[WhatsAppNo] [nvarchar](30) NULL,
	[Email] [nvarchar](150) NULL,
	[Address] [nvarchar](300) NULL,
	[Notes] [nvarchar](500) NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_Clients] PRIMARY KEY CLUSTERED 
(
	[ClientId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Deliverables]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Deliverables](
	[DeliverableId] [int] IDENTITY(1,1) NOT NULL,
	[OrderId] [int] NOT NULL,
	[RawBackupStatus] [nvarchar](20) NOT NULL,
	[SelectionMode] [nvarchar](20) NOT NULL,
	[SelectionStatus] [nvarchar](20) NOT NULL,
	[PhotoEditStatus] [nvarchar](20) NOT NULL,
	[TeaserEditStatus] [nvarchar](20) NOT NULL,
	[FullFilmEditStatus] [nvarchar](20) NOT NULL,
	[CloudProvider] [nvarchar](20) NULL,
	[CloudLink] [nvarchar](500) NULL,
	[DeliveredOn] [date] NULL,
	[UpdatedAt] [datetime2](0) NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_Deliverables] PRIMARY KEY CLUSTERED 
(
	[DeliverableId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Deliverables_Order] UNIQUE NONCLUSTERED 
(
	[OrderId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DocumentLines]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DocumentLines](
	[LineId] [int] IDENTITY(1,1) NOT NULL,
	[DocumentId] [int] NOT NULL,
	[Description] [nvarchar](300) NOT NULL,
	[Quantity] [decimal](9, 2) NOT NULL,
	[UnitPrice] [decimal](12, 2) NOT NULL,
	[LineTotal]  AS (CONVERT([decimal](12,2),[Quantity]*[UnitPrice])) PERSISTED,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_DocumentLines] PRIMARY KEY CLUSTERED 
(
	[LineId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Documents]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Documents](
	[DocumentId] [int] IDENTITY(1,1) NOT NULL,
	[OrderId] [int] NOT NULL,
	[DocumentType] [nvarchar](15) NOT NULL,
	[DocumentNumber] [nvarchar](30) NOT NULL,
	[IssueDate] [date] NOT NULL,
	[DueDate] [date] NULL,
	[Terms] [nvarchar](max) NULL,
	[Notes] [nvarchar](500) NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_Documents] PRIMARY KEY CLUSTERED 
(
	[DocumentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Documents_Number] UNIQUE NONCLUSTERED 
(
	[StudioId] ASC,
	[DocumentNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
/****** Object:  Table [dbo].[DocumentSequences]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[DocumentSequences](
	[DocumentType] [nvarchar](10) NOT NULL,
	[SeqYear] [int] NOT NULL,
	[LastNumber] [int] NOT NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_DocumentSequences] PRIMARY KEY CLUSTERED 
(
	[StudioId] ASC,
	[DocumentType] ASC,
	[SeqYear] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[EventTypes]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[EventTypes](
	[EventTypeId] [int] IDENTITY(1,1) NOT NULL,
	[EventTypeName] [nvarchar](30) NOT NULL,
	[SortOrder] [int] NOT NULL,
	[IsActive] [bit] NOT NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_EventTypes] PRIMARY KEY CLUSTERED 
(
	[EventTypeId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_EventTypes_Name] UNIQUE NONCLUSTERED 
(
	[StudioId] ASC,
	[EventTypeName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Expenses]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Expenses](
	[ExpenseId] [int] IDENTITY(1,1) NOT NULL,
	[OrderId] [int] NOT NULL,
	[Category] [nvarchar](30) NOT NULL,
	[Description] [nvarchar](300) NULL,
	[Amount] [decimal](12, 2) NOT NULL,
	[ExpenseDate] [date] NOT NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_Expenses] PRIMARY KEY CLUSTERED 
(
	[ExpenseId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[LoginAudits]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[LoginAudits](
	[AuditId] [bigint] IDENTITY(1,1) NOT NULL,
	[OwnerId] [int] NULL,
	[Username] [nvarchar](50) NOT NULL,
	[EventType] [nvarchar](12) NOT NULL,
	[OccurredAt] [datetime2](0) NOT NULL,
	[IpAddress] [nvarchar](45) NULL,
	[UserAgent] [nvarchar](300) NULL,
	[StudioId] [int] NULL,
 CONSTRAINT [PK_LoginAudits] PRIMARY KEY CLUSTERED 
(
	[AuditId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[OrderEventSlots]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[OrderEventSlots](
	[SlotId] [int] IDENTITY(1,1) NOT NULL,
	[OrderId] [int] NOT NULL,
	[EventDate] [date] NOT NULL,
	[StartTime] [time](0) NOT NULL,
	[EndTime] [time](0) NOT NULL,
	[Title] [nvarchar](100) NULL,
	[Venue] [nvarchar](300) NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_OrderEventSlots] PRIMARY KEY CLUSTERED 
(
	[SlotId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Orders]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Orders](
	[OrderId] [int] IDENTITY(1,1) NOT NULL,
	[OrderNumber] [nvarchar](20) NOT NULL,
	[ClientId] [int] NOT NULL,
	[PackageId] [int] NULL,
	[EventType] [nvarchar](30) NOT NULL,
	[OrderStatus] [nvarchar](30) NOT NULL,
	[EventDate] [date] NOT NULL,
	[Venue] [nvarchar](300) NULL,
	[Notes] [nvarchar](1000) NULL,
	[PackageAmount] [decimal](12, 2) NOT NULL,
	[DiscountAmount] [decimal](12, 2) NOT NULL,
	[TaxPercent] [decimal](5, 2) NOT NULL,
	[TaxAmount]  AS (CONVERT([decimal](12,2),round((([PackageAmount]-[DiscountAmount])*[TaxPercent])/(100.0),(2)))) PERSISTED,
	[TotalAmount]  AS (CONVERT([decimal](12,2),([PackageAmount]-[DiscountAmount])+round((([PackageAmount]-[DiscountAmount])*[TaxPercent])/(100.0),(2)))) PERSISTED,
	[CreatedAt] [datetime2](0) NOT NULL,
	[UpdatedAt] [datetime2](0) NULL,
	[TaxSplit] [nvarchar](12) NOT NULL,
	[CgstPercent] [decimal](5, 2) NULL,
	[CreatedBy] [nvarchar](50) NULL,
	[UpdatedBy] [nvarchar](50) NULL,
	[IncludesPhoto] [bit] NOT NULL,
	[IncludesVideo] [bit] NOT NULL,
	[IncludesAlbum] [bit] NOT NULL,
	[PhotoAmount] [decimal](12, 2) NOT NULL,
	[VideoAmount] [decimal](12, 2) NOT NULL,
	[AlbumAmount] [decimal](12, 2) NOT NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_Orders] PRIMARY KEY CLUSTERED 
(
	[OrderId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Orders_OrderNumber] UNIQUE NONCLUSTERED 
(
	[StudioId] ASC,
	[OrderNumber] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[OwnerAccounts]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[OwnerAccounts](
	[OwnerId] [int] IDENTITY(1,1) NOT NULL,
	[Username] [nvarchar](50) NOT NULL,
	[PasswordHash] [nvarchar](200) NOT NULL,
	[FullName] [nvarchar](100) NOT NULL,
	[Email] [nvarchar](150) NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[Role] [nvarchar](30) NOT NULL,
	[Permissions] [nvarchar](500) NULL,
	[StudioId] [int] NULL,
 CONSTRAINT [PK_OwnerAccounts] PRIMARY KEY CLUSTERED 
(
	[OwnerId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_OwnerAccounts_Username] UNIQUE NONCLUSTERED 
(
	[Username] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Packages]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Packages](
	[PackageId] [int] IDENTITY(1,1) NOT NULL,
	[PackageName] [nvarchar](120) NOT NULL,
	[EventType] [nvarchar](30) NULL,
	[BasePrice] [decimal](12, 2) NOT NULL,
	[Inclusions] [nvarchar](1000) NULL,
	[IsActive] [bit] NOT NULL,
	[PhotoPrice] [decimal](12, 2) NULL,
	[VideoPrice] [decimal](12, 2) NULL,
	[AlbumPrice] [decimal](12, 2) NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_Packages] PRIMARY KEY CLUSTERED 
(
	[PackageId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Packages_Name] UNIQUE NONCLUSTERED 
(
	[StudioId] ASC,
	[PackageName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Payments]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Payments](
	[PaymentId] [int] IDENTITY(1,1) NOT NULL,
	[OrderId] [int] NOT NULL,
	[PaymentType] [nvarchar](30) NOT NULL,
	[PaymentMode] [nvarchar](20) NOT NULL,
	[Amount] [decimal](12, 2) NOT NULL,
	[PaymentDate] [date] NOT NULL,
	[TransactionRef] [nvarchar](100) NULL,
	[Notes] [nvarchar](300) NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_Payments] PRIMARY KEY CLUSTERED 
(
	[PaymentId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Roles]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Roles](
	[RoleId] [int] IDENTITY(1,1) NOT NULL,
	[RoleName] [nvarchar](30) NOT NULL,
	[Description] [nvarchar](200) NULL,
	[Permissions] [nvarchar](500) NOT NULL,
	[IsSystem] [bit] NOT NULL,
	[StudioId] [int] NULL,
 CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED 
(
	[RoleId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Roles_Name] UNIQUE NONCLUSTERED 
(
	[RoleName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Studios]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Studios](
	[StudioId] [int] IDENTITY(1,1) NOT NULL,
	[StudioName] [nvarchar](150) NOT NULL,
	[IsActive] [bit] NOT NULL,
	[CreatedAt] [datetime2](0) NOT NULL,
 CONSTRAINT [PK_Studios] PRIMARY KEY CLUSTERED 
(
	[StudioId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_Studios_Name] UNIQUE NONCLUSTERED 
(
	[StudioName] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[StudioSettings]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[StudioSettings](
	[StudioSettingsId] [int] NOT NULL,
	[StudioName] [nvarchar](150) NOT NULL,
	[Tagline] [nvarchar](200) NULL,
	[AddressLine] [nvarchar](300) NULL,
	[Phone] [nvarchar](30) NULL,
	[Email] [nvarchar](150) NULL,
	[TaxRegistrationNo] [nvarchar](50) NULL,
	[DefaultTaxPercent] [decimal](5, 2) NOT NULL,
	[InvoicePrefix] [nvarchar](10) NOT NULL,
	[QuotationPrefix] [nvarchar](10) NOT NULL,
	[DefaultTerms] [nvarchar](max) NULL,
	[BankDetails] [nvarchar](500) NULL,
	[LogoUrl] [nvarchar](300) NULL,
	[StudioId] [int] NOT NULL,
 CONSTRAINT [PK_StudioSettings] PRIMARY KEY CLUSTERED 
(
	[StudioSettingsId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [UQ_StudioSettings_Studio] UNIQUE NONCLUSTERED 
(
	[StudioId] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO
ALTER TABLE [dbo].[Albums] ADD  CONSTRAINT [DF_Albums_Stage]  DEFAULT (N'Photo Selection Pending') FOR [AlbumStage]
GO
ALTER TABLE [dbo].[Albums] ADD  CONSTRAINT [DF_Albums_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Albums] ADD  CONSTRAINT [DF_Albums_SellingPrice]  DEFAULT ((0)) FOR [SellingPrice]
GO
ALTER TABLE [dbo].[Clients] ADD  CONSTRAINT [DF_Clients_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Deliverables] ADD  CONSTRAINT [DF_Deliv_Raw]  DEFAULT (N'Not Started') FOR [RawBackupStatus]
GO
ALTER TABLE [dbo].[Deliverables] ADD  CONSTRAINT [DF_Deliv_SelMode]  DEFAULT (N'Client Selection') FOR [SelectionMode]
GO
ALTER TABLE [dbo].[Deliverables] ADD  CONSTRAINT [DF_Deliv_Sel]  DEFAULT (N'Not Started') FOR [SelectionStatus]
GO
ALTER TABLE [dbo].[Deliverables] ADD  CONSTRAINT [DF_Deliv_Photo]  DEFAULT (N'Not Started') FOR [PhotoEditStatus]
GO
ALTER TABLE [dbo].[Deliverables] ADD  CONSTRAINT [DF_Deliv_Teaser]  DEFAULT (N'Not Started') FOR [TeaserEditStatus]
GO
ALTER TABLE [dbo].[Deliverables] ADD  CONSTRAINT [DF_Deliv_Film]  DEFAULT (N'Not Started') FOR [FullFilmEditStatus]
GO
ALTER TABLE [dbo].[DocumentLines] ADD  CONSTRAINT [DF_DocLines_Qty]  DEFAULT ((1)) FOR [Quantity]
GO
ALTER TABLE [dbo].[Documents] ADD  CONSTRAINT [DF_Documents_Issue]  DEFAULT (CONVERT([date],sysutcdatetime())) FOR [IssueDate]
GO
ALTER TABLE [dbo].[Documents] ADD  CONSTRAINT [DF_Documents_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[DocumentSequences] ADD  CONSTRAINT [DF_DocSeq_Last]  DEFAULT ((0)) FOR [LastNumber]
GO
ALTER TABLE [dbo].[EventTypes] ADD  CONSTRAINT [DF_EventTypes_Sort]  DEFAULT ((0)) FOR [SortOrder]
GO
ALTER TABLE [dbo].[EventTypes] ADD  CONSTRAINT [DF_EventTypes_Active]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Expenses] ADD  CONSTRAINT [DF_Expenses_Date]  DEFAULT (CONVERT([date],sysutcdatetime())) FOR [ExpenseDate]
GO
ALTER TABLE [dbo].[Expenses] ADD  CONSTRAINT [DF_Expenses_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[LoginAudits] ADD  CONSTRAINT [DF_LoginAudits_At]  DEFAULT (sysutcdatetime()) FOR [OccurredAt]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_Status]  DEFAULT (N'Pre-Order') FOR [OrderStatus]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_PkgAmt]  DEFAULT ((0)) FOR [PackageAmount]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_Disc]  DEFAULT ((0)) FOR [DiscountAmount]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_TaxPct]  DEFAULT ((0)) FOR [TaxPercent]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_TaxSplit]  DEFAULT (N'Single') FOR [TaxSplit]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_InclPhoto]  DEFAULT ((1)) FOR [IncludesPhoto]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_InclVideo]  DEFAULT ((0)) FOR [IncludesVideo]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_InclAlbum]  DEFAULT ((0)) FOR [IncludesAlbum]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_PhotoAmt]  DEFAULT ((0)) FOR [PhotoAmount]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_VideoAmt]  DEFAULT ((0)) FOR [VideoAmount]
GO
ALTER TABLE [dbo].[Orders] ADD  CONSTRAINT [DF_Orders_AlbumAmt]  DEFAULT ((0)) FOR [AlbumAmount]
GO
ALTER TABLE [dbo].[OwnerAccounts] ADD  CONSTRAINT [DF_OwnerAccounts_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[OwnerAccounts] ADD  CONSTRAINT [DF_OwnerAccounts_Role]  DEFAULT (N'Staff') FOR [Role]
GO
ALTER TABLE [dbo].[Packages] ADD  CONSTRAINT [DF_Packages_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Payments] ADD  CONSTRAINT [DF_Payments_Date]  DEFAULT (CONVERT([date],sysutcdatetime())) FOR [PaymentDate]
GO
ALTER TABLE [dbo].[Payments] ADD  CONSTRAINT [DF_Payments_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[Roles] ADD  CONSTRAINT [DF_Roles_Perms]  DEFAULT (N'') FOR [Permissions]
GO
ALTER TABLE [dbo].[Roles] ADD  CONSTRAINT [DF_Roles_IsSystem]  DEFAULT ((0)) FOR [IsSystem]
GO
ALTER TABLE [dbo].[Studios] ADD  CONSTRAINT [DF_Studios_IsActive]  DEFAULT ((1)) FOR [IsActive]
GO
ALTER TABLE [dbo].[Studios] ADD  CONSTRAINT [DF_Studios_CreatedAt]  DEFAULT (sysutcdatetime()) FOR [CreatedAt]
GO
ALTER TABLE [dbo].[StudioSettings] ADD  CONSTRAINT [DF_StudioSettings_Tax]  DEFAULT ((0)) FOR [DefaultTaxPercent]
GO
ALTER TABLE [dbo].[StudioSettings] ADD  CONSTRAINT [DF_StudioSettings_InvPrefix]  DEFAULT (N'INV') FOR [InvoicePrefix]
GO
ALTER TABLE [dbo].[StudioSettings] ADD  CONSTRAINT [DF_StudioSettings_QtPrefix]  DEFAULT (N'QTN') FOR [QuotationPrefix]
GO
ALTER TABLE [dbo].[Albums]  WITH CHECK ADD  CONSTRAINT [FK_Albums_Orders] FOREIGN KEY([OrderId])
REFERENCES [dbo].[Orders] ([OrderId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Albums] CHECK CONSTRAINT [FK_Albums_Orders]
GO
ALTER TABLE [dbo].[Albums]  WITH CHECK ADD  CONSTRAINT [FK_Albums_Packages] FOREIGN KEY([PackageId])
REFERENCES [dbo].[Packages] ([PackageId])
GO
ALTER TABLE [dbo].[Albums] CHECK CONSTRAINT [FK_Albums_Packages]
GO
ALTER TABLE [dbo].[Albums]  WITH CHECK ADD  CONSTRAINT [FK_Albums_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[Albums] CHECK CONSTRAINT [FK_Albums_Studios]
GO
ALTER TABLE [dbo].[Clients]  WITH CHECK ADD  CONSTRAINT [FK_Clients_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[Clients] CHECK CONSTRAINT [FK_Clients_Studios]
GO
ALTER TABLE [dbo].[Deliverables]  WITH CHECK ADD  CONSTRAINT [FK_Deliverables_Orders] FOREIGN KEY([OrderId])
REFERENCES [dbo].[Orders] ([OrderId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[Deliverables] CHECK CONSTRAINT [FK_Deliverables_Orders]
GO
ALTER TABLE [dbo].[Deliverables]  WITH CHECK ADD  CONSTRAINT [FK_Deliverables_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[Deliverables] CHECK CONSTRAINT [FK_Deliverables_Studios]
GO
ALTER TABLE [dbo].[DocumentLines]  WITH CHECK ADD  CONSTRAINT [FK_DocumentLines_Documents] FOREIGN KEY([DocumentId])
REFERENCES [dbo].[Documents] ([DocumentId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[DocumentLines] CHECK CONSTRAINT [FK_DocumentLines_Documents]
GO
ALTER TABLE [dbo].[DocumentLines]  WITH CHECK ADD  CONSTRAINT [FK_DocumentLines_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[DocumentLines] CHECK CONSTRAINT [FK_DocumentLines_Studios]
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD  CONSTRAINT [FK_Documents_Orders] FOREIGN KEY([OrderId])
REFERENCES [dbo].[Orders] ([OrderId])
GO
ALTER TABLE [dbo].[Documents] CHECK CONSTRAINT [FK_Documents_Orders]
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD  CONSTRAINT [FK_Documents_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[Documents] CHECK CONSTRAINT [FK_Documents_Studios]
GO
ALTER TABLE [dbo].[DocumentSequences]  WITH CHECK ADD  CONSTRAINT [FK_DocumentSequences_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[DocumentSequences] CHECK CONSTRAINT [FK_DocumentSequences_Studios]
GO
ALTER TABLE [dbo].[EventTypes]  WITH CHECK ADD  CONSTRAINT [FK_EventTypes_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[EventTypes] CHECK CONSTRAINT [FK_EventTypes_Studios]
GO
ALTER TABLE [dbo].[Expenses]  WITH CHECK ADD  CONSTRAINT [FK_Expenses_Orders] FOREIGN KEY([OrderId])
REFERENCES [dbo].[Orders] ([OrderId])
GO
ALTER TABLE [dbo].[Expenses] CHECK CONSTRAINT [FK_Expenses_Orders]
GO
ALTER TABLE [dbo].[Expenses]  WITH CHECK ADD  CONSTRAINT [FK_Expenses_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[Expenses] CHECK CONSTRAINT [FK_Expenses_Studios]
GO
ALTER TABLE [dbo].[OrderEventSlots]  WITH CHECK ADD  CONSTRAINT [FK_OrderEventSlots_Orders] FOREIGN KEY([OrderId])
REFERENCES [dbo].[Orders] ([OrderId])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[OrderEventSlots] CHECK CONSTRAINT [FK_OrderEventSlots_Orders]
GO
ALTER TABLE [dbo].[OrderEventSlots]  WITH CHECK ADD  CONSTRAINT [FK_OrderEventSlots_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[OrderEventSlots] CHECK CONSTRAINT [FK_OrderEventSlots_Studios]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [FK_Orders_Clients] FOREIGN KEY([ClientId])
REFERENCES [dbo].[Clients] ([ClientId])
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [FK_Orders_Clients]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [FK_Orders_EventTypes] FOREIGN KEY([StudioId], [EventType])
REFERENCES [dbo].[EventTypes] ([StudioId], [EventTypeName])
ON UPDATE CASCADE
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [FK_Orders_EventTypes]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [FK_Orders_Packages] FOREIGN KEY([PackageId])
REFERENCES [dbo].[Packages] ([PackageId])
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [FK_Orders_Packages]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [FK_Orders_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [FK_Orders_Studios]
GO
ALTER TABLE [dbo].[OwnerAccounts]  WITH CHECK ADD  CONSTRAINT [FK_OwnerAccounts_Roles] FOREIGN KEY([Role])
REFERENCES [dbo].[Roles] ([RoleName])
ON UPDATE CASCADE
GO
ALTER TABLE [dbo].[OwnerAccounts] CHECK CONSTRAINT [FK_OwnerAccounts_Roles]
GO
ALTER TABLE [dbo].[OwnerAccounts]  WITH CHECK ADD  CONSTRAINT [FK_OwnerAccounts_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[OwnerAccounts] CHECK CONSTRAINT [FK_OwnerAccounts_Studios]
GO
ALTER TABLE [dbo].[Packages]  WITH CHECK ADD  CONSTRAINT [FK_Packages_EventTypes] FOREIGN KEY([StudioId], [EventType])
REFERENCES [dbo].[EventTypes] ([StudioId], [EventTypeName])
GO
ALTER TABLE [dbo].[Packages] CHECK CONSTRAINT [FK_Packages_EventTypes]
GO
ALTER TABLE [dbo].[Packages]  WITH CHECK ADD  CONSTRAINT [FK_Packages_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[Packages] CHECK CONSTRAINT [FK_Packages_Studios]
GO
ALTER TABLE [dbo].[Payments]  WITH CHECK ADD  CONSTRAINT [FK_Payments_Orders] FOREIGN KEY([OrderId])
REFERENCES [dbo].[Orders] ([OrderId])
GO
ALTER TABLE [dbo].[Payments] CHECK CONSTRAINT [FK_Payments_Orders]
GO
ALTER TABLE [dbo].[Payments]  WITH CHECK ADD  CONSTRAINT [FK_Payments_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[Payments] CHECK CONSTRAINT [FK_Payments_Studios]
GO
ALTER TABLE [dbo].[Roles]  WITH CHECK ADD  CONSTRAINT [FK_Roles_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[Roles] CHECK CONSTRAINT [FK_Roles_Studios]
GO
ALTER TABLE [dbo].[StudioSettings]  WITH CHECK ADD  CONSTRAINT [FK_StudioSettings_Studios] FOREIGN KEY([StudioId])
REFERENCES [dbo].[Studios] ([StudioId])
GO
ALTER TABLE [dbo].[StudioSettings] CHECK CONSTRAINT [FK_StudioSettings_Studios]
GO
ALTER TABLE [dbo].[Albums]  WITH CHECK ADD  CONSTRAINT [CK_Albums_Cost] CHECK  (([PrintCost]>=(0)))
GO
ALTER TABLE [dbo].[Albums] CHECK CONSTRAINT [CK_Albums_Cost]
GO
ALTER TABLE [dbo].[Albums]  WITH CHECK ADD  CONSTRAINT [CK_Albums_SellingPrice] CHECK  (([SellingPrice]>=(0)))
GO
ALTER TABLE [dbo].[Albums] CHECK CONSTRAINT [CK_Albums_SellingPrice]
GO
ALTER TABLE [dbo].[Albums]  WITH CHECK ADD  CONSTRAINT [CK_Albums_Sheets] CHECK  (([SheetCount]>(0)))
GO
ALTER TABLE [dbo].[Albums] CHECK CONSTRAINT [CK_Albums_Sheets]
GO
ALTER TABLE [dbo].[Albums]  WITH CHECK ADD  CONSTRAINT [CK_Albums_Stage] CHECK  (([AlbumStage]=N'Handed Over to Client' OR [AlbumStage]=N'Album Received' OR [AlbumStage]=N'Sent to Print Lab' OR [AlbumStage]=N'Client Proofing' OR [AlbumStage]=N'Sheet Designing' OR [AlbumStage]=N'Photo Selection Pending'))
GO
ALTER TABLE [dbo].[Albums] CHECK CONSTRAINT [CK_Albums_Stage]
GO
ALTER TABLE [dbo].[Deliverables]  WITH CHECK ADD  CONSTRAINT [CK_Deliv_Film] CHECK  (([FullFilmEditStatus]=N'Completed' OR [FullFilmEditStatus]=N'In Progress' OR [FullFilmEditStatus]=N'Not Started'))
GO
ALTER TABLE [dbo].[Deliverables] CHECK CONSTRAINT [CK_Deliv_Film]
GO
ALTER TABLE [dbo].[Deliverables]  WITH CHECK ADD  CONSTRAINT [CK_Deliv_Photo] CHECK  (([PhotoEditStatus]=N'Completed' OR [PhotoEditStatus]=N'In Progress' OR [PhotoEditStatus]=N'Not Started'))
GO
ALTER TABLE [dbo].[Deliverables] CHECK CONSTRAINT [CK_Deliv_Photo]
GO
ALTER TABLE [dbo].[Deliverables]  WITH CHECK ADD  CONSTRAINT [CK_Deliv_Provider] CHECK  (([CloudProvider]=N'Other' OR [CloudProvider]=N'Dropbox' OR [CloudProvider]=N'WeTransfer' OR [CloudProvider]=N'Google Drive'))
GO
ALTER TABLE [dbo].[Deliverables] CHECK CONSTRAINT [CK_Deliv_Provider]
GO
ALTER TABLE [dbo].[Deliverables]  WITH CHECK ADD  CONSTRAINT [CK_Deliv_Raw] CHECK  (([RawBackupStatus]=N'Completed' OR [RawBackupStatus]=N'In Progress' OR [RawBackupStatus]=N'Not Started'))
GO
ALTER TABLE [dbo].[Deliverables] CHECK CONSTRAINT [CK_Deliv_Raw]
GO
ALTER TABLE [dbo].[Deliverables]  WITH CHECK ADD  CONSTRAINT [CK_Deliv_Sel] CHECK  (([SelectionStatus]=N'Completed' OR [SelectionStatus]=N'In Progress' OR [SelectionStatus]=N'Not Started'))
GO
ALTER TABLE [dbo].[Deliverables] CHECK CONSTRAINT [CK_Deliv_Sel]
GO
ALTER TABLE [dbo].[Deliverables]  WITH CHECK ADD  CONSTRAINT [CK_Deliv_SelMode] CHECK  (([SelectionMode]=N'Studio Selection' OR [SelectionMode]=N'Client Selection'))
GO
ALTER TABLE [dbo].[Deliverables] CHECK CONSTRAINT [CK_Deliv_SelMode]
GO
ALTER TABLE [dbo].[Deliverables]  WITH CHECK ADD  CONSTRAINT [CK_Deliv_Teaser] CHECK  (([TeaserEditStatus]=N'Completed' OR [TeaserEditStatus]=N'In Progress' OR [TeaserEditStatus]=N'Not Started'))
GO
ALTER TABLE [dbo].[Deliverables] CHECK CONSTRAINT [CK_Deliv_Teaser]
GO
ALTER TABLE [dbo].[DocumentLines]  WITH CHECK ADD  CONSTRAINT [CK_DocLines_Price] CHECK  (([UnitPrice]>=(0)))
GO
ALTER TABLE [dbo].[DocumentLines] CHECK CONSTRAINT [CK_DocLines_Price]
GO
ALTER TABLE [dbo].[DocumentLines]  WITH CHECK ADD  CONSTRAINT [CK_DocLines_Qty] CHECK  (([Quantity]>(0)))
GO
ALTER TABLE [dbo].[DocumentLines] CHECK CONSTRAINT [CK_DocLines_Qty]
GO
ALTER TABLE [dbo].[Documents]  WITH CHECK ADD  CONSTRAINT [CK_Documents_Type] CHECK  (([DocumentType]=N'Invoice' OR [DocumentType]=N'Quotation'))
GO
ALTER TABLE [dbo].[Documents] CHECK CONSTRAINT [CK_Documents_Type]
GO
ALTER TABLE [dbo].[Expenses]  WITH CHECK ADD  CONSTRAINT [CK_Expenses_Amount] CHECK  (([Amount]>(0)))
GO
ALTER TABLE [dbo].[Expenses] CHECK CONSTRAINT [CK_Expenses_Amount]
GO
ALTER TABLE [dbo].[Expenses]  WITH CHECK ADD  CONSTRAINT [CK_Expenses_Category] CHECK  (([Category]=N'Other' OR [Category]=N'Food / Stay' OR [Category]=N'Assistant' OR [Category]=N'Print Lab' OR [Category]=N'Travel / Fuel' OR [Category]=N'Equipment Rental' OR [Category]=N'Second Shooter'))
GO
ALTER TABLE [dbo].[Expenses] CHECK CONSTRAINT [CK_Expenses_Category]
GO
ALTER TABLE [dbo].[LoginAudits]  WITH CHECK ADD  CONSTRAINT [CK_LoginAudits_Event] CHECK  (([EventType]=N'LoginFailed' OR [EventType]=N'Logout' OR [EventType]=N'Login'))
GO
ALTER TABLE [dbo].[LoginAudits] CHECK CONSTRAINT [CK_LoginAudits_Event]
GO
ALTER TABLE [dbo].[OrderEventSlots]  WITH CHECK ADD  CONSTRAINT [CK_OrderEventSlots_Time] CHECK  (([EndTime]>[StartTime]))
GO
ALTER TABLE [dbo].[OrderEventSlots] CHECK CONSTRAINT [CK_OrderEventSlots_Time]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [CK_Orders_CgstPct] CHECK  (([CgstPercent] IS NULL OR [CgstPercent]>=(0) AND [CgstPercent]<=[TaxPercent]))
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [CK_Orders_CgstPct]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [CK_Orders_Disc] CHECK  (([DiscountAmount]>=(0)))
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [CK_Orders_Disc]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [CK_Orders_DiscountLimit] CHECK  (([DiscountAmount]<=[PackageAmount]))
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [CK_Orders_DiscountLimit]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [CK_Orders_PkgAmt] CHECK  (([PackageAmount]>=(0)))
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [CK_Orders_PkgAmt]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [CK_Orders_Status] CHECK  (([OrderStatus]=N'Cancelled' OR [OrderStatus]=N'Delivered' OR [OrderStatus]=N'In Post-Production' OR [OrderStatus]=N'Shoot Completed' OR [OrderStatus]=N'Confirmed' OR [OrderStatus]=N'Pending' OR [OrderStatus]=N'Pre-Order'))
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [CK_Orders_Status]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [CK_Orders_TaxPct] CHECK  (([TaxPercent]>=(0) AND [TaxPercent]<=(100)))
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [CK_Orders_TaxPct]
GO
ALTER TABLE [dbo].[Orders]  WITH CHECK ADD  CONSTRAINT [CK_Orders_TaxSplit] CHECK  (([TaxSplit]=N'CGST+SGST' OR [TaxSplit]=N'Single'))
GO
ALTER TABLE [dbo].[Orders] CHECK CONSTRAINT [CK_Orders_TaxSplit]
GO
ALTER TABLE [dbo].[OwnerAccounts]  WITH CHECK ADD  CONSTRAINT [CK_OwnerAccounts_Studio] CHECK  (([Role]=N'SuperAdmin' AND [StudioId] IS NULL OR [Role]<>N'SuperAdmin' AND [StudioId] IS NOT NULL))
GO
ALTER TABLE [dbo].[OwnerAccounts] CHECK CONSTRAINT [CK_OwnerAccounts_Studio]
GO
ALTER TABLE [dbo].[Packages]  WITH CHECK ADD  CONSTRAINT [CK_Packages_Parts] CHECK  ((([PhotoPrice] IS NULL OR [PhotoPrice]>=(0)) AND ([VideoPrice] IS NULL OR [VideoPrice]>=(0)) AND ([AlbumPrice] IS NULL OR [AlbumPrice]>=(0))))
GO
ALTER TABLE [dbo].[Packages] CHECK CONSTRAINT [CK_Packages_Parts]
GO
ALTER TABLE [dbo].[Packages]  WITH CHECK ADD  CONSTRAINT [CK_Packages_Price] CHECK  (([BasePrice]>=(0)))
GO
ALTER TABLE [dbo].[Packages] CHECK CONSTRAINT [CK_Packages_Price]
GO
ALTER TABLE [dbo].[Payments]  WITH CHECK ADD  CONSTRAINT [CK_Payments_Amount] CHECK  (([Amount]>(0)))
GO
ALTER TABLE [dbo].[Payments] CHECK CONSTRAINT [CK_Payments_Amount]
GO
ALTER TABLE [dbo].[Payments]  WITH CHECK ADD  CONSTRAINT [CK_Payments_Mode] CHECK  (([PaymentMode]=N'Cheque' OR [PaymentMode]=N'Card' OR [PaymentMode]=N'Cash' OR [PaymentMode]=N'Bank Transfer' OR [PaymentMode]=N'UPI'))
GO
ALTER TABLE [dbo].[Payments] CHECK CONSTRAINT [CK_Payments_Mode]
GO
ALTER TABLE [dbo].[Payments]  WITH CHECK ADD  CONSTRAINT [CK_Payments_Type] CHECK  (([PaymentType]=N'Other' OR [PaymentType]=N'Final Delivery Balance' OR [PaymentType]=N'Shoot-Day Payment' OR [PaymentType]=N'Booking Advance'))
GO
ALTER TABLE [dbo].[Payments] CHECK CONSTRAINT [CK_Payments_Type]
GO
ALTER TABLE [dbo].[StudioSettings]  WITH CHECK ADD  CONSTRAINT [CK_StudioSettings_Tax] CHECK  (([DefaultTaxPercent]>=(0) AND [DefaultTaxPercent]<=(100)))
GO
ALTER TABLE [dbo].[StudioSettings] CHECK CONSTRAINT [CK_StudioSettings_Tax]
GO
/****** Object:  StoredProcedure [dbo].[usp_GetNextDocumentNumber]    Script Date: 11/24/2026 9:56:55 AM ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE   PROCEDURE [dbo].[usp_GetNextDocumentNumber]
    @StudioId   INT,
    @Prefix     NVARCHAR(10),
    @Year       INT,
    @NextNumber INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRAN;
        UPDATE dbo.DocumentSequences WITH (UPDLOCK, HOLDLOCK)
           SET LastNumber = LastNumber + 1, @NextNumber = LastNumber + 1
         WHERE StudioId = @StudioId AND DocumentType = @Prefix AND SeqYear = @Year;

        IF @@ROWCOUNT = 0
        BEGIN
            INSERT dbo.DocumentSequences (StudioId, DocumentType, SeqYear, LastNumber) VALUES (@StudioId, @Prefix, @Year, 1);
            SET @NextNumber = 1;
        END
    COMMIT;
END

GO


insert into Roles(RoleName,Description,Permissions,IsSystem)
values('SuperAdmin','Platform administrator: creates studios and logins, manages options and roles, sees every studio.'
,'albums.delete,albums.edit,clients.delete,clients.edit,documents.manage,orders.delete,orders.edit,owners.manage,payments.delete,payments.record,settings.manage',1),
('Owner','Studio owner: full rights inside their own studio (settings, event types, packages, logins and roles).'
,'albums.delete,albums.edit,clients.delete,clients.edit,documents.manage,orders.delete,orders.edit,owners.manage,payments.delete,payments.record,settings.manage',1)
,('Staff','Studio staff: day-to-day work, no deletes or invoicing.'
,'albums.edit,clients.edit,orders.edit,payments.record',1)
GO

insert into OwnerAccounts(Username,PasswordHash,FullName,Email,Role) 
values ('Leo','$2a$11$6L/MM/BxCKtU3hvQj6Y6IOhd3GLlk2T3ubxaGcJd3nHxbDeDMGkxO','Maria Leo','marialeo@gmail.com','SuperAdmin')
GO
