/* =====================================================================
   007_PackageComponents_Upgrade.sql
   Upgrades an EXISTING PhotoStudioDB (after 006_...). A fresh install of the
   current PhotoStudioDB.sql already contains this - do not run both.
   Run with SSMS, or: sqlcmd -S MARIALEO -U sa -P ... -C -I -i <this file>

   A package is a bundle of up to three parts, each with its own price:
   Photo, Video, Album (NULL price = the part is not in that package).
   An order records which parts were chosen and their prices; Orders.PackageAmount
   stays the sum of the chosen parts, so totals, balances and invoices are unchanged.

   This also replaces Packages.PackageType from 006 (a package that only has an
   Album price is simply an album-only package).
   ===================================================================== */
USE PhotoStudioDB;
GO

-- ---------- Packages: price per part ----------
IF COL_LENGTH(N'dbo.Packages', N'PhotoPrice') IS NULL ALTER TABLE dbo.Packages ADD PhotoPrice DECIMAL(12,2) NULL;
IF COL_LENGTH(N'dbo.Packages', N'VideoPrice') IS NULL ALTER TABLE dbo.Packages ADD VideoPrice DECIMAL(12,2) NULL;
IF COL_LENGTH(N'dbo.Packages', N'AlbumPrice') IS NULL ALTER TABLE dbo.Packages ADD AlbumPrice DECIMAL(12,2) NULL;
GO
IF OBJECT_ID(N'dbo.CK_Packages_Parts') IS NULL
    ALTER TABLE dbo.Packages ADD CONSTRAINT CK_Packages_Parts
        CHECK ((PhotoPrice IS NULL OR PhotoPrice >= 0) AND (VideoPrice IS NULL OR VideoPrice >= 0) AND (AlbumPrice IS NULL OR AlbumPrice >= 0));
GO
-- Existing packages had one price: keep it as the Photo part so nothing changes.
UPDATE dbo.Packages SET PhotoPrice = BasePrice
WHERE PhotoPrice IS NULL AND VideoPrice IS NULL AND AlbumPrice IS NULL;
GO

-- 006's package type is no longer needed.
IF OBJECT_ID(N'dbo.CK_Packages_Type') IS NOT NULL ALTER TABLE dbo.Packages DROP CONSTRAINT CK_Packages_Type;
IF OBJECT_ID(N'dbo.DF_Packages_Type') IS NOT NULL ALTER TABLE dbo.Packages DROP CONSTRAINT DF_Packages_Type;
GO
IF COL_LENGTH(N'dbo.Packages', N'PackageType') IS NOT NULL ALTER TABLE dbo.Packages DROP COLUMN PackageType;
GO

-- ---------- Orders: which parts were chosen, and their prices ----------
IF COL_LENGTH(N'dbo.Orders', N'IncludesPhoto') IS NULL ALTER TABLE dbo.Orders ADD IncludesPhoto BIT NOT NULL CONSTRAINT DF_Orders_InclPhoto DEFAULT 1;
IF COL_LENGTH(N'dbo.Orders', N'IncludesVideo') IS NULL ALTER TABLE dbo.Orders ADD IncludesVideo BIT NOT NULL CONSTRAINT DF_Orders_InclVideo DEFAULT 0;
IF COL_LENGTH(N'dbo.Orders', N'IncludesAlbum') IS NULL ALTER TABLE dbo.Orders ADD IncludesAlbum BIT NOT NULL CONSTRAINT DF_Orders_InclAlbum DEFAULT 0;
GO
IF COL_LENGTH(N'dbo.Orders', N'PhotoAmount') IS NULL ALTER TABLE dbo.Orders ADD PhotoAmount DECIMAL(12,2) NOT NULL CONSTRAINT DF_Orders_PhotoAmt DEFAULT 0;
IF COL_LENGTH(N'dbo.Orders', N'VideoAmount') IS NULL ALTER TABLE dbo.Orders ADD VideoAmount DECIMAL(12,2) NOT NULL CONSTRAINT DF_Orders_VideoAmt DEFAULT 0;
IF COL_LENGTH(N'dbo.Orders', N'AlbumAmount') IS NULL ALTER TABLE dbo.Orders ADD AlbumAmount DECIMAL(12,2) NOT NULL CONSTRAINT DF_Orders_AlbumAmt DEFAULT 0;
GO
-- Existing orders had one amount: treat it as Photo so every total stays the same.
UPDATE dbo.Orders SET PhotoAmount = PackageAmount
WHERE PhotoAmount = 0 AND VideoAmount = 0 AND AlbumAmount = 0 AND PackageAmount > 0;
GO
