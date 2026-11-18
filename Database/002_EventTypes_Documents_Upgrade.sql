/* =====================================================================
   002_EventTypes_Documents_Upgrade.sql
   Upgrades an EXISTING PhotoStudioDB created from the first version of
   PhotoStudioDB.sql. (A fresh install of the current PhotoStudioDB.sql
   already includes all of this - do not run both.)
   Run with SSMS, or: sqlcmd -S MARIALEO -U sa -P ... -C -I -i <this file>
   ===================================================================== */
USE PhotoStudioDB;
GO

IF OBJECT_ID(N'dbo.EventTypes') IS NULL
BEGIN
    CREATE TABLE dbo.EventTypes (
        EventTypeId    INT IDENTITY(1,1) CONSTRAINT PK_EventTypes PRIMARY KEY,
        EventTypeName  NVARCHAR(30) NOT NULL CONSTRAINT UQ_EventTypes_Name UNIQUE,
        SortOrder      INT          NOT NULL CONSTRAINT DF_EventTypes_Sort DEFAULT 0,
        IsActive       BIT          NOT NULL CONSTRAINT DF_EventTypes_Active DEFAULT 1
    );
    INSERT dbo.EventTypes (EventTypeName, SortOrder) VALUES
    (N'Wedding',1),(N'Pre-Wedding',2),(N'Engagement',3),(N'Maternity',4),(N'Newborn',5),
    (N'Birthday',6),(N'Corporate',7),(N'Portrait',8),(N'Product',9),(N'Other',10);
END
GO

-- Any event type already used by orders/packages must exist before the foreign keys are added.
INSERT dbo.EventTypes (EventTypeName, SortOrder)
SELECT DISTINCT x.EventType, 99
FROM (SELECT EventType FROM dbo.Orders UNION SELECT EventType FROM dbo.Packages WHERE EventType IS NOT NULL) x
WHERE NOT EXISTS (SELECT 1 FROM dbo.EventTypes e WHERE e.EventTypeName = x.EventType);
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Orders_EventType')
    ALTER TABLE dbo.Orders DROP CONSTRAINT CK_Orders_EventType;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Orders_EventTypes')
    ALTER TABLE dbo.Orders ADD CONSTRAINT FK_Orders_EventTypes
        FOREIGN KEY (EventType) REFERENCES dbo.EventTypes(EventTypeName) ON UPDATE CASCADE;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Packages_EventTypes')
    ALTER TABLE dbo.Packages ADD CONSTRAINT FK_Packages_EventTypes
        FOREIGN KEY (EventType) REFERENCES dbo.EventTypes(EventTypeName) ON UPDATE CASCADE;
GO

-- Duplicates created before this rule existed: keep the OLDEST quotation/invoice per order, drop the later copies.
-- (Their lines are removed by ON DELETE CASCADE. Review with: SELECT * FROM dbo.Documents ORDER BY OrderId, DocumentId)
DELETE d
FROM dbo.Documents d
WHERE EXISTS (SELECT 1 FROM dbo.Documents o
              WHERE o.OrderId = d.OrderId AND o.DocumentType = d.DocumentType AND o.DocumentId < d.DocumentId);
GO

-- One quotation and one invoice per order (a composite index, so EF still models Order -> Documents as one-to-many).
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Documents_OneQuotationPerOrder') DROP INDEX UX_Documents_OneQuotationPerOrder ON dbo.Documents;
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Documents_OneInvoicePerOrder')   DROP INDEX UX_Documents_OneInvoicePerOrder   ON dbo.Documents;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Documents_OrderId_Type')
    CREATE UNIQUE INDEX UX_Documents_OrderId_Type ON dbo.Documents (OrderId, DocumentType);
GO