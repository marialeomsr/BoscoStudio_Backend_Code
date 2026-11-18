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

/// <summary>Manage who can sign in and what they may do (see <see cref="Roles"/>). Admin only.</summary>
public class OwnerService(PhotoStudioDbContext db) : IOwnerService
{
    public async Task<List<OwnerDto>> GetAllAsync(int currentOwnerId, CancellationToken ct) =>
        (await db.OwnerAccounts.AsNoTracking().OrderBy(o => o.CreatedAt).ThenBy(o => o.OwnerId).ToListAsync(ct))
            .Select(o => ToDto(o, currentOwnerId)).ToList();

    public async Task<OwnerDto> CreateAsync(CreateOwnerRequest r, int currentOwnerId, CancellationToken ct)
    {
        string username = r.Username.Trim();
        if (await db.OwnerAccounts.AnyAsync(o => o.Username == username, ct))
            throw new ConflictException($"The username '{username}' is already taken.");

        var owner = new OwnerAccount
        {
            Username = username,
            FullName = r.FullName.Trim(),
            Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim(),
            Role = r.Role,
            Permissions = AppPermissions.Serialize(r.Permissions),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.Password, 11)
        };
        db.OwnerAccounts.Add(owner);
        await db.SaveChangesAsync(ct);
        return ToDto(owner, currentOwnerId);
    }

    public async Task<OwnerDto> UpdateAsync(int ownerId, UpdateOwnerRequest r, int currentOwnerId, CancellationToken ct)
    {
        if (ownerId == currentOwnerId) throw new BusinessRuleException("Use \"My account\" to edit your own details.");
        var owner = await db.OwnerAccounts.FindAsync([ownerId], ct) ?? throw new NotFoundException("Owner", ownerId);

        string username = r.Username.Trim();
        if (await db.OwnerAccounts.AnyAsync(o => o.Username == username && o.OwnerId != ownerId, ct))
            throw new ConflictException($"The username '{username}' is already taken.");

        owner.Username = username;
        owner.FullName = r.FullName.Trim();
        owner.Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim();
        if (r.Permissions is not null && owner.Role != Roles.Admin) owner.Permissions = AppPermissions.Serialize(r.Permissions);
        if (!string.IsNullOrEmpty(r.NewPassword)) owner.PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.NewPassword, 11);
        await db.SaveChangesAsync(ct);
        return ToDto(owner, currentOwnerId);
    }

    public async Task<OwnerDto> ChangeRoleAsync(int ownerId, string role, int currentOwnerId, CancellationToken ct)
    {
        var owner = await db.OwnerAccounts.FindAsync([ownerId], ct) ?? throw new NotFoundException("Owner", ownerId);
        if (owner.Role == Roles.Admin && role != Roles.Admin) await EnsureAnotherAdminAsync(ownerId, ct);

        owner.Role = role;
        owner.Permissions = null;   // a new role starts from that role's preset
        // their open session is ended on the next request, they sign in again with the new role
        await db.SaveChangesAsync(ct);
        return ToDto(owner, currentOwnerId);
    }

    public async Task DeleteAsync(int ownerId, int currentOwnerId, CancellationToken ct)
    {
        if (ownerId == currentOwnerId) throw new BusinessRuleException("You cannot delete the account you are signed in with.");
        var owner = await db.OwnerAccounts.FindAsync([ownerId], ct) ?? throw new NotFoundException("Owner", ownerId);
        if (owner.Role == Roles.Admin) await EnsureAnotherAdminAsync(ownerId, ct);

        db.OwnerAccounts.Remove(owner);   // their open sessions stop working on the next request (see Program.cs)
        await db.SaveChangesAsync(ct);
    }

    public async Task ResetPasswordAsync(int ownerId, int currentOwnerId, string newPassword, CancellationToken ct)
    {
        if (ownerId == currentOwnerId) throw new BusinessRuleException("Use \"Change password\" for your own account.");
        var owner = await db.OwnerAccounts.FindAsync([ownerId], ct) ?? throw new NotFoundException("Owner", ownerId);
        owner.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, 11);
        await db.SaveChangesAsync(ct);
    }

    /// <summary>The studio must never end up without an Admin (nobody could manage settings or owners).</summary>
    private async Task EnsureAnotherAdminAsync(int ownerId, CancellationToken ct)
    {
        if (!await db.OwnerAccounts.AnyAsync(o => o.OwnerId != ownerId && o.Role == Roles.Admin, ct))
            throw new BusinessRuleException("At least one Admin must remain.");
    }

    private static OwnerDto ToDto(OwnerAccount o, int currentOwnerId) =>
        new(o.OwnerId, o.Username, o.FullName, o.Email, o.Role, o.CreatedAt, o.OwnerId == currentOwnerId, AppPermissions.Effective(o.Role, o.Permissions));
}
