using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Domain.Entities;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IRoleService
{
    Task<List<RoleDto>> GetAllAsync(CancellationToken ct);
    Task<RoleDto> CreateAsync(SaveRoleRequest request, CancellationToken ct);
    Task<RoleDto> UpdateAsync(int roleId, SaveRoleRequest request, CancellationToken ct);
    Task DeleteAsync(int roleId, CancellationToken ct);
}

/// <summary>
/// The Role master. Shared roles (SuperAdmin, Owner, Staff, ...) are changed by the SuperAdmin only. A studio Owner can add, change and delete
/// roles that belong to their own studio; the query filter on Roles hides every other studio's roles.
/// </summary>
public class RoleService(PhotoStudioDbContext db, ICurrentStudio studio) : IRoleService
{
    public async Task<List<RoleDto>> GetAllAsync(CancellationToken ct)
    {
        int? studioId = studio.StudioId;
        bool all = studio.IsSuperAdmin;
        // logins are counted within the studio in scope (the SuperAdmin sees the studio they picked)
        return (await db.Roles.AsNoTracking().OrderBy(r => r.RoleId)
            .Select(r => new { Role = r, Users = db.OwnerAccounts.Count(o => o.Role == r.RoleName && (o.StudioId == studioId || (all && studioId == null))) })
            .ToListAsync(ct))
            .Select(x => ToDto(x.Role, x.Users)).ToList();
    }

    public async Task<RoleDto> CreateAsync(SaveRoleRequest r, CancellationToken ct)
    {
        string name = r.RoleName.Trim();
        await EnsureNameFreeAsync(name, null, ct);
        // Owners always make roles for their own studio; the SuperAdmin chooses between a shared role and one for the studio in scope.
        int? studioId = studio.IsSuperAdmin && !r.ForThisStudio ? null : studio.StudioId ?? throw new BusinessRuleException("Choose a studio first.");
        var role = new Role { RoleName = name, Description = Clean(r.Description), Permissions = AppPermissions.Serialize(r.Permissions) ?? "", IsSystem = false, StudioId = studioId };
        db.Roles.Add(role);
        await db.SaveChangesAsync(ct);
        return ToDto(role, 0);
    }

    public async Task<RoleDto> UpdateAsync(int roleId, SaveRoleRequest r, CancellationToken ct)
    {
        var role = await FindEditableAsync(roleId, ct);
        string name = r.RoleName.Trim();
        if (role.IsSystem && name != role.RoleName) throw new BusinessRuleException($"'{role.RoleName}' is a system role and cannot be renamed.");
        await EnsureNameFreeAsync(name, roleId, ct);

        role.RoleName = name;   // logins follow the rename (ON UPDATE CASCADE) and sign in again
        role.Description = Clean(r.Description);
        // the SuperAdmin role always has everything, whatever is saved
        role.Permissions = role.RoleName == Roles.SuperAdmin ? string.Join(',', AppPermissions.All.Order()) : AppPermissions.Serialize(r.Permissions) ?? "";
        await db.SaveChangesAsync(ct);
        return ToDto(role, await db.OwnerAccounts.CountAsync(o => o.Role == role.RoleName && o.StudioId == studio.StudioId, ct));
    }

    public async Task DeleteAsync(int roleId, CancellationToken ct)
    {
        var role = await FindEditableAsync(roleId, ct);
        if (role.IsSystem) throw new BusinessRuleException($"'{role.RoleName}' is a system role and cannot be deleted.");
        if (await db.OwnerAccounts.AnyAsync(o => o.Role == role.RoleName, ct))
            throw new BusinessRuleException("Logins still use this role. Move them to another role first.");
        db.Roles.Remove(role);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>A role the caller may change: any visible role for the SuperAdmin, only the studio's own roles for an Owner.</summary>
    private async Task<Role> FindEditableAsync(int roleId, CancellationToken ct)
    {
        var role = await db.Roles.FirstOrDefaultAsync(x => x.RoleId == roleId, ct) ?? throw new NotFoundException("Role", roleId);
        if (!studio.IsSuperAdmin && role.StudioId != studio.StudioId)
            throw new BusinessRuleException("This is a shared role. Only the SuperAdmin can change it; add a role of your own instead.");
        return role;
    }

    /// <summary>Role names are unique across all studios (logins point at the name), so the check must see every studio's roles.</summary>
    private async Task EnsureNameFreeAsync(string name, int? exceptId, CancellationToken ct)
    {
        if (await db.Roles.IgnoreQueryFilters().AnyAsync(x => x.RoleName == name && x.RoleId != (exceptId ?? 0), ct))
            throw new ConflictException($"The role name '{name}' is already in use. Choose another name.");
    }

    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static RoleDto ToDto(Role r, int users) =>
        new(r.RoleId, r.RoleName, r.Description, AppPermissions.Effective(r.RoleName, r.Permissions, null), r.IsSystem, users, r.StudioId);
}
