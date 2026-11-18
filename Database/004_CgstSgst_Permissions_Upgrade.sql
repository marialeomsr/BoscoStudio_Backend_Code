/* =====================================================================
   004_CgstSgst_Permissions_Upgrade.sql
   Upgrades an EXISTING PhotoStudioDB (after 003_...). A fresh install of the
   current PhotoStudioDB.sql already contains this - do not run both.
   Run with SSMS, or: sqlcmd -S MARIALEO -U sa -P ... -C -I -i <this file>
   ===================================================================== */
USE PhotoStudioDB;
GO

-- Separate CGST / SGST rates. TaxPercent stays the total; NULL CgstPercent = equal halves (how existing orders were shown).
IF COL_LENGTH(N'dbo.Orders', N'CgstPercent') IS NULL
BEGIN
    ALTER TABLE dbo.Orders ADD CgstPercent DECIMAL(5,2) NULL;
END
GO
IF OBJECT_ID(N'dbo.CK_Orders_CgstPct') IS NULL
    ALTER TABLE dbo.Orders ADD CONSTRAINT CK_Orders_CgstPct
        CHECK (CgstPercent IS NULL OR (CgstPercent >= 0 AND CgstPercent <= TaxPercent));
GO

-- Per-owner permissions. NULL = the role's preset (Admin = everything), so nobody's access changes until an Admin edits it.
IF COL_LENGTH(N'dbo.OwnerAccounts', N'Permissions') IS NULL
BEGIN
    ALTER TABLE dbo.OwnerAccounts ADD Permissions NVARCHAR(500) NULL;
END
GO
