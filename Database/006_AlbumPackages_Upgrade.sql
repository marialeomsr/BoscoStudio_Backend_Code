/* =====================================================================
   006_AlbumPackages_Upgrade.sql
   Upgrades an EXISTING PhotoStudioDB (after 005_...). A fresh install of the
   current PhotoStudioDB.sql already contains this - do not run both.
   Run with SSMS, or: sqlcmd -S MARIALEO -U sa -P ... -C -I -i <this file>

   Albums become a separately priced item:
     - Packages.PackageType : 'Shoot' (photoshoot, as before) or 'Album' (album catalogue)
     - Albums.SellingPrice  : what the client pays for the album (revenue)
     - Albums.PackageId     : the album package it was sold from (optional)
     - Albums.PrintCost     : unchanged, now treated as cost of the album, not an order expense
   Existing albums get SellingPrice 0, so no existing order total or balance changes.
   ===================================================================== */
-- (database is chosen by the caller: sqlcmd -d <DbName> ...  or the SSMS database dropdown)
GO

IF COL_LENGTH(N'dbo.Packages', N'PackageType') IS NULL
BEGIN
    ALTER TABLE dbo.Packages ADD PackageType NVARCHAR(10) NOT NULL CONSTRAINT DF_Packages_Type DEFAULT N'Shoot';
END
GO
IF OBJECT_ID(N'dbo.CK_Packages_Type') IS NULL
    ALTER TABLE dbo.Packages ADD CONSTRAINT CK_Packages_Type CHECK (PackageType IN (N'Shoot', N'Album'));
GO

IF COL_LENGTH(N'dbo.Albums', N'SellingPrice') IS NULL
BEGIN
    ALTER TABLE dbo.Albums ADD SellingPrice DECIMAL(12,2) NOT NULL CONSTRAINT DF_Albums_SellingPrice DEFAULT 0;
END
GO
IF OBJECT_ID(N'dbo.CK_Albums_SellingPrice') IS NULL
    ALTER TABLE dbo.Albums ADD CONSTRAINT CK_Albums_SellingPrice CHECK (SellingPrice >= 0);
GO

IF COL_LENGTH(N'dbo.Albums', N'PackageId') IS NULL
BEGIN
    ALTER TABLE dbo.Albums ADD PackageId INT NULL CONSTRAINT FK_Albums_Packages REFERENCES dbo.Packages(PackageId);
END
GO
