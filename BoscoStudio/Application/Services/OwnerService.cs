using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Domain.Entities;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IOwnerService
{
    Task<List<OwnerDto>> GetAllAsync(int currentOwnerId, CancellationToken ct);
    Task<OwnerDto> CreateAsync(CreateOwnerRequest request, int currentOwnerId, CancellationToken ct);
    Task<OwnerDto> UpdateAsync(int ownerId, UpdateOwnerRequest request, int currentOwnerId, CancellationToken ct);
    Task<OwnerDto> ChangeRoleAsync(int ownerId, string role, int currentOwnerId, CancellationToken ct);
    Task DeleteAsync(int ownerId, int currentOwnerId, CancellationToken ct);
    Task ResetPasswordAsync(int ownerId, int currentOwnerId, string newPassword, CancellationToken ct);
}

/// <summary>
/// Manage who can sign in to the studio in scope and what they may do. Every call is limited to that studio (the SuperAdmin picks it
/// with the X-Studio-Id header), so one studio can never see or change another studio's logins.
/// </summary>
public class OwnerService(PhotoStudioDbContext db, ICurrentStudio studio) : IOwnerService
{
    private int StudioId => studio.StudioId ?? throw new BusinessRuleException("Choose a studio first.");

    private IQueryable<OwnerAccount> InStudio => db.OwnerAccounts.Where(o => o.StudioId == studio.StudioId);

    public async Task<List<OwnerDto>> GetAllAsync(int currentOwnerId, CancellationToken ct)
    {
        var owners = await InStudio.AsNoTracking().OrderBy(o => o.CreatedAt).ThenBy(o => o.OwnerId).ToListAsync(ct);
        var defaults = await RoleDefaultsAsync(ct);
        string? name = await StudioNameAsync(ct);
        return owners.Select(o => ToDto(o, currentOwnerId, defaults, name)).ToList();
    }

    public async Task<OwnerDto> CreateAsync(CreateOwnerRequest r, int currentOwnerId, CancellationToken ct)
    {
        int studioId = StudioId;
        await EnsureAssignableRoleAsync(r.Role, ct);
        string username = r.Username.Trim();
        if (await db.OwnerAccounts.AnyAsync(o => o.Username == username, ct))
            throw new ConflictException($"The username '{username}' is already taken.");

        var owner = new OwnerAccount
        {
            Username = username,
            FullName = r.FullName.Trim(),
            Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim(),
            Role = r.Role,
            StudioId = studioId,
            Permissions = AppPermissions.Serialize(r.Permissions),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.Password, 11)
        };
        db.OwnerAccounts.Add(owner);
        await db.SaveChangesAsync(ct);
        return ToDto(owner, currentOwnerId, await RoleDefaultsAsync(ct), await StudioNameAsync(ct));
    }

    public async Task<OwnerDto> UpdateAsync(int ownerId, UpdateOwnerRequest r, int currentOwnerId, CancellationToken ct)
    {
        if (ownerId == currentOwnerId) throw new BusinessRuleException("Use \"My account\" to edit your own details.");
        var owner = await FindAsync(ownerId, ct);

        string username = r.Username.Trim();
        if (await db.OwnerAccounts.AnyAsync(o => o.Username == username && o.OwnerId != ownerId, ct))
            throw new ConflictException($"The username '{username}' is already taken.");

        owner.Username = username;
        owner.FullName = r.FullName.Trim();
        owner.Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim();
        if (r.Permissions is not null) owner.Permissions = AppPermissions.Serialize(r.Permissions);
        if (!string.IsNullOrEmpty(r.NewPassword)) owner.PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.NewPassword, 11);
        await db.SaveChangesAsync(ct);
        return ToDto(owner, currentOwnerId, await RoleDefaultsAsync(ct), await StudioNameAsync(ct));
    }

    public async Task<OwnerDto> ChangeRoleAsync(int ownerId, string role, int currentOwnerId, CancellationToken ct)
    {
        var owner = await FindAsync(ownerId, ct);
        await EnsureAssignableRoleAsync(role, ct);
        if (owner.Role == Roles.Owner && role != Roles.Owner) await EnsureAnotherOwnerAsync(ownerId, ct);

        owner.Role = role;
        owner.Permissions = null;   // a new role starts from that role's default set
        // their open session is ended on the next request, they sign in again with the new role
        await db.SaveChangesAsync(ct);
        return ToDto(owner, currentOwnerId, await RoleDefaultsAsync(ct), await StudioNameAsync(ct));
    }

    public async Task DeleteAsync(int ownerId, int currentOwnerId, CancellationToken ct)
    {
        if (ownerId == currentOwnerId) throw new BusinessRuleException("You cannot delete the account you are signed in with.");
        var owner = await FindAsync(ownerId, ct);
        if (owner.Role == Roles.Owner) await EnsureAnotherOwnerAsync(ownerId, ct);

        db.OwnerAccounts.Remove(owner);   // their open sessions stop working on the next request (see Program.cs)
        await db.SaveChangesAsync(ct);
    }

    public async Task ResetPasswordAsync(int ownerId, int currentOwnerId, string newPassword, CancellationToken ct)
    {
        if (ownerId == currentOwnerId) throw new BusinessRuleException("Use \"Change password\" for your own account.");
        var owner = await FindAsync(ownerId, ct);
        owner.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, 11);
        await db.SaveChangesAsync(ct);
    }

    private async Task<OwnerAccount> FindAsync(int ownerId, CancellationToken ct) =>
        await InStudio.FirstOrDefaultAsync(o => o.OwnerId == ownerId, ct) ?? throw new NotFoundException("Owner", ownerId);

    /// <summary>The role must exist in the Roles master; SuperAdmin is not a studio role.</summary>
    private async Task EnsureAssignableRoleAsync(string role, CancellationToken ct)
    {
        if (role == Roles.SuperAdmin || !await db.Roles.AnyAsync(r => r.RoleName == role, ct))
            throw new BusinessRuleException($"Unknown role '{role}'.");
    }

    /// <summary>A studio must never end up without an Owner login.</summary>
    private async Task EnsureAnotherOwnerAsync(int ownerId, CancellationToken ct)
    {
        if (!await InStudio.AnyAsync(o => o.OwnerId != ownerId && o.Role == Roles.Owner, ct))
            throw new BusinessRuleException("The studio must keep at least one Owner.");
    }

    private Task<Dictionary<string, string>> RoleDefaultsAsync(CancellationToken ct) =>
        db.Roles.IgnoreQueryFilters().AsNoTracking().ToDictionaryAsync(r => r.RoleName, r => r.Permissions, ct);

    private Task<string?> StudioNameAsync(CancellationToken ct) =>
        db.Studios.AsNoTracking().Where(s => s.StudioId == studio.StudioId).Select(s => (string?)s.StudioName).FirstOrDefaultAsync(ct);

    private static OwnerDto ToDto(OwnerAccount o, int currentOwnerId, Dictionary<string, string> roleDefaults, string? studioName) =>
        new(o.OwnerId, o.Username, o.FullName, o.Email, o.Role, o.CreatedAt, o.OwnerId == currentOwnerId,
            AppPermissions.Effective(o.Role, roleDefaults.GetValueOrDefault(o.Role), o.Permissions), o.StudioId, studioName);
}
