/* =====================================================================
   005_AuditTrail_Upgrade.sql
   Upgrades an EXISTING PhotoStudioDB (after 004_...). A fresh install of the
   current PhotoStudioDB.sql already contains this - do not run both.
   Run with SSMS, or: sqlcmd -S MARIALEO -U sa -P ... -C -I -i <this file>
   ===================================================================== */
USE PhotoStudioDB;
GO

-- Who created / last changed an order (the owner's username at that moment; NULL for orders made before this upgrade).
IF COL_LENGTH(N'dbo.Orders', N'CreatedBy') IS NULL
    ALTER TABLE dbo.Orders ADD CreatedBy NVARCHAR(50) NULL;
GO
IF COL_LENGTH(N'dbo.Orders', N'UpdatedBy') IS NULL
    ALTER TABLE dbo.Orders ADD UpdatedBy NVARCHAR(50) NULL;
GO

-- Sign-in history: successful logins, failed attempts and logouts.
-- No foreign key on purpose: the history must survive an owner being deleted or renamed.
IF OBJECT_ID(N'dbo.LoginAudits') IS NULL
BEGIN
    CREATE TABLE dbo.LoginAudits (
        AuditId     BIGINT IDENTITY(1,1) CONSTRAINT PK_LoginAudits PRIMARY KEY,
        OwnerId     INT           NULL,                         -- NULL when the username does not exist
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
