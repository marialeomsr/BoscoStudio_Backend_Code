using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Domain.Entities;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IStudioService
{
    Task<List<StudioDto>> GetAllAsync(CancellationToken ct);
    Task<StudioDto> CreateAsync(CreateStudioRequest request, CancellationToken ct);
    Task<StudioDto> UpdateAsync(int studioId, UpdateStudioRequest request, CancellationToken ct);
    Task DeleteAsync(int studioId, CancellationToken ct);
}

/// <summary>Client studios. SuperAdmin only. Uses IgnoreQueryFilters because the SuperAdmin works across studios.</summary>
public class StudioService(PhotoStudioDbContext db) : IStudioService
{
    private static readonly string[] DefaultEventTypes =
        ["Wedding", "Pre-Wedding", "Engagement", "Maternity", "Newborn", "Birthday", "Corporate", "Portrait", "Product", "Other"];

    public async Task<List<StudioDto>> GetAllAsync(CancellationToken ct) =>
        await db.Studios.AsNoTracking().OrderBy(s => s.StudioName)
            .Select(s => new StudioDto(
                s.StudioId, s.StudioName, s.IsActive, s.CreatedAt,
                db.OwnerAccounts.Count(o => o.StudioId == s.StudioId),
                db.Orders.IgnoreQueryFilters().Count(o => o.StudioId == s.StudioId)))
            .ToListAsync(ct);

    public async Task<StudioDto> CreateAsync(CreateStudioRequest r, CancellationToken ct)
    {
        string name = r.StudioName.Trim(), username = r.OwnerUsername.Trim();
        if (await db.Studios.AnyAsync(s => s.StudioName == name, ct)) throw new ConflictException($"A studio named '{name}' already exists.");
        if (await db.OwnerAccounts.AnyAsync(o => o.Username == username, ct)) throw new ConflictException($"The username '{username}' is already taken.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var studio = new Studio { StudioName = name, IsActive = true };
        db.Studios.Add(studio);
        await db.SaveChangesAsync(ct);

        // everything the studio needs to start working: its settings row, the standard event types and its Owner login
        db.StudioSettings.Add(new StudioSetting
        {
            StudioSettingsId = studio.StudioId, StudioId = studio.StudioId, StudioName = name,
            InvoicePrefix = "INV", QuotationPrefix = "QTN", DefaultTaxPercent = 0,
        });
        for (int i = 0; i < DefaultEventTypes.Length; i++)
            db.EventTypes.Add(new EventType { StudioId = studio.StudioId, EventTypeName = DefaultEventTypes[i], SortOrder = i + 1, IsActive = true });
        db.OwnerAccounts.Add(new OwnerAccount
        {
            Username = username, FullName = r.OwnerFullName.Trim(),
            Email = string.IsNullOrWhiteSpace(r.OwnerEmail) ? null : r.OwnerEmail.Trim(),
            Role = Roles.Owner, StudioId = studio.StudioId,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(r.OwnerPassword, 11),
        });
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return await GetAsync(studio.StudioId, ct);
    }

    public async Task<StudioDto> UpdateAsync(int studioId, UpdateStudioRequest r, CancellationToken ct)
    {
        var studio = await db.Studios.FindAsync([studioId], ct) ?? throw new NotFoundException("Studio", studioId);
        string name = r.StudioName.Trim();
        if (await db.Studios.AnyAsync(s => s.StudioName == name && s.StudioId != studioId, ct))
            throw new ConflictException($"A studio named '{name}' already exists.");

        string oldName = studio.StudioName;
        studio.StudioName = name;
        studio.IsActive = r.IsActive;   // switched off = its logins are refused at sign-in and open sessions end on the next request
        // keep the name printed on documents in step, unless it was customised
        await db.StudioSettings.IgnoreQueryFilters().Where(s => s.StudioId == studioId && s.StudioName == oldName)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.StudioName, name), ct);
        await db.SaveChangesAsync(ct);
        return await GetAsync(studioId, ct);
    }

    public async Task DeleteAsync(int studioId, CancellationToken ct)
    {
        var studio = await db.Studios.FindAsync([studioId], ct) ?? throw new NotFoundException("Studio", studioId);
        if (await db.Clients.IgnoreQueryFilters().AnyAsync(c => c.StudioId == studioId, ct)
            || await db.Orders.IgnoreQueryFilters().AnyAsync(o => o.StudioId == studioId, ct))
            throw new BusinessRuleException("This studio already has clients or orders. Switch it off (inactive) instead of deleting.");

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.OwnerAccounts.Where(o => o.StudioId == studioId).ExecuteDeleteAsync(ct);
        await db.Packages.IgnoreQueryFilters().Where(p => p.StudioId == studioId).ExecuteDeleteAsync(ct);
        await db.EventTypes.IgnoreQueryFilters().Where(e => e.StudioId == studioId).ExecuteDeleteAsync(ct);
        await db.StudioSettings.IgnoreQueryFilters().Where(s => s.StudioId == studioId).ExecuteDeleteAsync(ct);
        await db.DocumentSequences.Where(s => s.StudioId == studioId).ExecuteDeleteAsync(ct);
        await db.LoginAudits.Where(a => a.StudioId == studioId).ExecuteUpdateAsync(a => a.SetProperty(x => x.StudioId, (int?)null), ct);
        db.Studios.Remove(studio);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    private async Task<StudioDto> GetAsync(int studioId, CancellationToken ct) =>
        (await GetAllAsync(ct)).First(s => s.StudioId == studioId);
}
