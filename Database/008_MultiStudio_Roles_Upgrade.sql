/* =====================================================================
   008_MultiStudio_Roles_Upgrade.sql
   Upgrades an EXISTING PhotoStudioDB (after 007_...). One application, many studios:
     * dbo.Studios              - one row per client studio (created by the SuperAdmin)
     * dbo.Roles                - role master (SuperAdmin / Owner / Manager / Staff + default permissions)
     * StudioId on every data table, so each studio only ever sees its own rows
     * OwnerAccounts.StudioId   - NULL = SuperAdmin (sees every studio)
     * LoginAudits.StudioId     - so the SuperAdmin login report can be filtered per studio
   Everything that exists today is moved into studio 1 (the existing StudioSettings row).
   Existing role 'Admin' is renamed 'Owner'. A SuperAdmin login 'superadmin' is created with the SAME password as
   the existing first owner login - change it straight away.
   Run with SSMS, or: sqlcmd -S MARIALEO -U sa -P ... -C -I -i <this file>
   ===================================================================== */
USE PhotoStudioDB;
GO
SET QUOTED_IDENTIFIER ON;
GO

/* ---------- 1. Studios ---------- */
IF OBJECT_ID(N'dbo.Studios') IS NULL
BEGIN
    CREATE TABLE dbo.Studios (
        StudioId   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Studios PRIMARY KEY,
        StudioName NVARCHAR(150) NOT NULL CONSTRAINT UQ_Studios_Name UNIQUE,
        IsActive   BIT NOT NULL CONSTRAINT DF_Studios_IsActive DEFAULT 1,
        CreatedAt  DATETIME2(0) NOT NULL CONSTRAINT DF_Studios_CreatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO
IF NOT EXISTS (SELECT 1 FROM dbo.Studios)
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.StudioSettings)
        INSERT dbo.Studios (StudioName) SELECT TOP 1 StudioName FROM dbo.StudioSettings ORDER BY StudioSettingsId;
    ELSE
        INSERT dbo.Studios (StudioName) VALUES (N'Studio');
END
GO

/* ---------- 2. Roles master ---------- */
IF OBJECT_ID(N'dbo.Roles') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        RoleId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Roles PRIMARY KEY,
        RoleName    NVARCHAR(30)  NOT NULL CONSTRAINT UQ_Roles_Name UNIQUE,
        Description NVARCHAR(200) NULL,
        Permissions NVARCHAR(500) NOT NULL CONSTRAINT DF_Roles_Perms DEFAULT N'',   -- default permission set (comma separated)
        IsSystem    BIT NOT NULL CONSTRAINT DF_Roles_IsSystem DEFAULT 0              -- system roles cannot be renamed or deleted
    );
    INSERT dbo.Roles (RoleName, Description, Permissions, IsSystem) VALUES
    (N'SuperAdmin', N'Platform administrator: creates studios and logins, manages options and roles, sees every studio.',
        N'albums.delete,albums.edit,clients.delete,clients.edit,documents.manage,orders.delete,orders.edit,owners.manage,payments.delete,payments.record,settings.manage', 1),
    (N'Owner',   N'Studio owner: full day-to-day work in their own studio.',
        N'albums.delete,albums.edit,clients.delete,clients.edit,documents.manage,orders.delete,orders.edit,payments.delete,payments.record', 1),
    (N'Manager', N'Studio manager: same as Owner by default.',
        N'albums.delete,albums.edit,clients.delete,clients.edit,documents.manage,orders.delete,orders.edit,payments.delete,payments.record', 0),
    (N'Staff',   N'Studio staff: day-to-day work, no deletes or invoicing.',
        N'albums.edit,clients.edit,orders.edit,payments.record', 0);
END
GO

/* ---------- 3. OwnerAccounts: Role -> Roles master, StudioId ---------- */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_OwnerAccounts_Role') ALTER TABLE dbo.OwnerAccounts DROP CONSTRAINT CK_OwnerAccounts_Role;
GO
DECLARE @df sysname = (SELECT dc.name FROM sys.default_constraints dc JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
                       WHERE dc.parent_object_id = OBJECT_ID(N'dbo.OwnerAccounts') AND c.name = N'Role');
IF @df IS NOT NULL EXEC (N'ALTER TABLE dbo.OwnerAccounts DROP CONSTRAINT ' + @df);
GO
ALTER TABLE dbo.OwnerAccounts ALTER COLUMN Role NVARCHAR(30) NOT NULL;
GO
IF COL_LENGTH(N'dbo.OwnerAccounts', N'StudioId') IS NULL ALTER TABLE dbo.OwnerAccounts ADD StudioId INT NULL;
GO
UPDATE dbo.OwnerAccounts SET Role = N'Owner' WHERE Role = N'Admin';
UPDATE dbo.OwnerAccounts SET StudioId = (SELECT MIN(StudioId) FROM dbo.Studios) WHERE StudioId IS NULL AND Role <> N'SuperAdmin';
GO
IF NOT EXISTS (SELECT 1 FROM sys.default_constraints WHERE name = N'DF_OwnerAccounts_Role')
    ALTER TABLE dbo.OwnerAccounts ADD CONSTRAINT DF_OwnerAccounts_Role DEFAULT N'Staff' FOR Role;
IF OBJECT_ID(N'dbo.FK_OwnerAccounts_Roles') IS NULL
    ALTER TABLE dbo.OwnerAccounts ADD CONSTRAINT FK_OwnerAccounts_Roles FOREIGN KEY (Role) REFERENCES dbo.Roles (RoleName) ON UPDATE CASCADE;
IF OBJECT_ID(N'dbo.FK_OwnerAccounts_Studios') IS NULL
    ALTER TABLE dbo.OwnerAccounts ADD CONSTRAINT FK_OwnerAccounts_Studios FOREIGN KEY (StudioId) REFERENCES dbo.Studios (StudioId);
GO
-- SuperAdmin login (StudioId NULL). Same password hash as the existing first owner; change it after the first sign-in.
IF NOT EXISTS (SELECT 1 FROM dbo.OwnerAccounts WHERE Role = N'SuperAdmin')
    INSERT dbo.OwnerAccounts (Username, PasswordHash, FullName, Email, Role, StudioId)
    SELECT TOP 1 N'superadmin', PasswordHash, N'Super Admin', NULL, N'SuperAdmin', NULL FROM dbo.OwnerAccounts ORDER BY OwnerId;
GO
-- a studio login must belong to a studio; only the SuperAdmin has none
IF OBJECT_ID(N'dbo.CK_OwnerAccounts_Studio') IS NULL
    ALTER TABLE dbo.OwnerAccounts ADD CONSTRAINT CK_OwnerAccounts_Studio
        CHECK ((Role = N'SuperAdmin' AND StudioId IS NULL) OR (Role <> N'SuperAdmin' AND StudioId IS NOT NULL));
GO

/* ---------- 4. LoginAudits.StudioId (nullable: failed logins of unknown users, SuperAdmin) ---------- */
IF COL_LENGTH(N'dbo.LoginAudits', N'StudioId') IS NULL ALTER TABLE dbo.LoginAudits ADD StudioId INT NULL;
GO
UPDATE a SET a.StudioId = o.StudioId FROM dbo.LoginAudits a JOIN dbo.OwnerAccounts o ON o.OwnerId = a.OwnerId WHERE a.StudioId IS NULL;
GO

/* ---------- 5. StudioId on every data table (existing rows -> first studio) ---------- */
DECLARE @tables TABLE (t sysname);
INSERT @tables VALUES (N'Clients'),(N'Orders'),(N'OrderEventSlots'),(N'Deliverables'),(N'Albums'),(N'Payments'),(N'Expenses'),
                      (N'Documents'),(N'DocumentLines'),(N'DocumentSequences'),(N'EventTypes'),(N'Packages'),(N'StudioSettings');
DECLARE @t sysname, @sql NVARCHAR(MAX);
DECLARE c CURSOR LOCAL FAST_FORWARD FOR SELECT t FROM @tables;
OPEN c; FETCH NEXT FROM c INTO @t;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF COL_LENGTH(N'dbo.' + @t, N'StudioId') IS NULL
    BEGIN
        SET @sql = N'ALTER TABLE dbo.' + @t + N' ADD StudioId INT NULL;';
        EXEC (@sql);
        SET @sql = N'UPDATE dbo.' + @t + N' SET StudioId = (SELECT MIN(StudioId) FROM dbo.Studios);';
        EXEC (@sql);
        SET @sql = N'ALTER TABLE dbo.' + @t + N' ALTER COLUMN StudioId INT NOT NULL;';
        EXEC (@sql);
        SET @sql = N'ALTER TABLE dbo.' + @t + N' ADD CONSTRAINT FK_' + @t + N'_Studios FOREIGN KEY (StudioId) REFERENCES dbo.Studios (StudioId);';
        EXEC (@sql);
        IF @t NOT IN (N'DocumentSequences', N'StudioSettings')
        BEGIN
            SET @sql = N'CREATE INDEX IX_' + @t + N'_StudioId ON dbo.' + @t + N' (StudioId);';
            EXEC (@sql);
        END
    END
    FETCH NEXT FROM c INTO @t;
END
CLOSE c; DEALLOCATE c;
GO

/* ---------- 6. Names / numbers are unique per studio, not globally ---------- */
-- the by-name foreign keys must go first
IF OBJECT_ID(N'dbo.FK_Orders_EventTypes')   IS NOT NULL ALTER TABLE dbo.Orders   DROP CONSTRAINT FK_Orders_EventTypes;
IF OBJECT_ID(N'dbo.FK_Packages_EventTypes') IS NOT NULL ALTER TABLE dbo.Packages DROP CONSTRAINT FK_Packages_EventTypes;
GO
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_EventTypes_Name')    ALTER TABLE dbo.EventTypes DROP CONSTRAINT UQ_EventTypes_Name;
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_Packages_Name')      ALTER TABLE dbo.Packages   DROP CONSTRAINT UQ_Packages_Name;
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_Orders_OrderNumber') ALTER TABLE dbo.Orders     DROP CONSTRAINT UQ_Orders_OrderNumber;
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_Documents_Number')   ALTER TABLE dbo.Documents  DROP CONSTRAINT UQ_Documents_Number;
GO
ALTER TABLE dbo.EventTypes ADD CONSTRAINT UQ_EventTypes_Name    UNIQUE (StudioId, EventTypeName);
ALTER TABLE dbo.Packages   ADD CONSTRAINT UQ_Packages_Name      UNIQUE (StudioId, PackageName);
ALTER TABLE dbo.Orders     ADD CONSTRAINT UQ_Orders_OrderNumber UNIQUE (StudioId, OrderNumber);
ALTER TABLE dbo.Documents  ADD CONSTRAINT UQ_Documents_Number   UNIQUE (StudioId, DocumentNumber);
GO
ALTER TABLE dbo.Orders ADD CONSTRAINT FK_Orders_EventTypes FOREIGN KEY (StudioId, EventType)
    REFERENCES dbo.EventTypes (StudioId, EventTypeName) ON UPDATE CASCADE;
ALTER TABLE dbo.Packages ADD CONSTRAINT FK_Packages_EventTypes FOREIGN KEY (StudioId, EventType)
    REFERENCES dbo.EventTypes (StudioId, EventTypeName);
GO

/* ---------- 7. Document numbering per studio ---------- */
DECLARE @pk sysname = (SELECT name FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.DocumentSequences') AND type = 'PK');
IF @pk IS NOT NULL EXEC (N'ALTER TABLE dbo.DocumentSequences DROP CONSTRAINT ' + @pk);
GO
ALTER TABLE dbo.DocumentSequences ADD CONSTRAINT PK_DocumentSequences PRIMARY KEY (StudioId, DocumentType, SeqYear);
GO
CREATE OR ALTER PROCEDURE dbo.usp_GetNextDocumentNumber
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

/* ---------- 8. One settings row PER studio ---------- */
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_StudioSettings_SingleRow') ALTER TABLE dbo.StudioSettings DROP CONSTRAINT CK_StudioSettings_SingleRow;
GO
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = N'UQ_StudioSettings_Studio')
    ALTER TABLE dbo.StudioSettings ADD CONSTRAINT UQ_StudioSettings_Studio UNIQUE (StudioId);
GO
PRINT 'Done. Sign in as superadmin (same password as the existing owner login) and create studios under Settings -> Studios.';
GO
