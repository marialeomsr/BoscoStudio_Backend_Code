/* =====================================================================
   003_TaxSplit_Roles_Upgrade.sql
   Upgrades an EXISTING PhotoStudioDB (after 002_...). A fresh install of the
   current PhotoStudioDB.sql already contains this - do not run both.
   Run with SSMS, or: sqlcmd -S MARIALEO -U sa -P ... -C -I -i <this file>
   ===================================================================== */
USE PhotoStudioDB;
GO

-- Owner roles. Every existing owner becomes Admin, so nobody loses access.
IF COL_LENGTH(N'dbo.OwnerAccounts', N'Role') IS NULL
BEGIN
    ALTER TABLE dbo.OwnerAccounts ADD Role NVARCHAR(10) NOT NULL
        CONSTRAINT DF_OwnerAccounts_Role DEFAULT N'Admin'
        CONSTRAINT CK_OwnerAccounts_Role CHECK (Role IN (N'Admin', N'Manager', N'Staff'));
END
GO

-- Tax shown as one line or split into CGST + SGST (display only; totals are unchanged).
IF COL_LENGTH(N'dbo.Orders', N'TaxSplit') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD TaxSplit NVARCHAR(12) NOT NULL
        CONSTRAINT DF_Orders_TaxSplit DEFAULT N'Single'
        CONSTRAINT CK_Orders_TaxSplit CHECK (TaxSplit IN (N'Single', N'CGST+SGST'));
END
GO
