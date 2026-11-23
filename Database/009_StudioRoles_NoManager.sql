/* =====================================================================
   009_StudioRoles_NoManager.sql
   Upgrades an EXISTING PhotoStudioDB (after 008_...).
     * The studio Owner now has full rights inside their own studio (settings, event types, packages, logins, roles).
     * Roles.StudioId: NULL = shared role (SuperAdmin / Owner / Staff, managed by the SuperAdmin);
       a value = a custom role that one studio's Owner created for that studio only.
     * The 'Manager' role is removed (anyone who had it becomes Staff).
   Run with SSMS, or: sqlcmd -S MARIALEO -U sa -P ... -C -I -i <this file>
   ===================================================================== */
USE PhotoStudioDB;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.Roles', N'StudioId') IS NULL ALTER TABLE dbo.Roles ADD StudioId INT NULL;
GO
IF OBJECT_ID(N'dbo.FK_Roles_Studios') IS NULL
    ALTER TABLE dbo.Roles ADD CONSTRAINT FK_Roles_Studios FOREIGN KEY (StudioId) REFERENCES dbo.Studios (StudioId);
GO

-- Owner: everything a studio can do, including its own settings and logins (never the SuperAdmin-only pages)
UPDATE dbo.Roles SET
    Description = N'Studio owner: full rights inside their own studio (settings, event types, packages, logins and roles).',
    Permissions = N'albums.delete,albums.edit,clients.delete,clients.edit,documents.manage,orders.delete,orders.edit,owners.manage,payments.delete,payments.record,settings.manage'
WHERE RoleName = N'Owner';
GO

-- remove Manager
UPDATE dbo.OwnerAccounts SET Role = N'Staff', Permissions = NULL WHERE Role = N'Manager';
DELETE FROM dbo.Roles WHERE RoleName = N'Manager' AND StudioId IS NULL;
GO
PRINT 'Done.';
GO
