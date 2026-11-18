using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Domain.Entities;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

/// <summary>Owner-managed event types and the packages that belong to them.</summary>
public interface ICatalogService
{
    Task<List<EventTypeDto>> GetEventTypesAsync(bool includeInactive, CancellationToken ct);
    Task<EventTypeDto> CreateEventTypeAsync(SaveEventTypeRequest request, CancellationToken ct);
    Task<EventTypeDto> UpdateEventTypeAsync(int id, SaveEventTypeRequest request, CancellationToken ct);
    Task DeleteEventTypeAsync(int id, CancellationToken ct);

    Task<List<PackageDto>> GetPackagesAsync(bool includeInactive, CancellationToken ct);
    Task<PackageDto> CreatePackageAsync(SavePackageRequest request, CancellationToken ct);
    Task<PackageDto> UpdatePackageAsync(int id, SavePackageRequest request, CancellationToken ct);
    Task DeletePackageAsync(int id, CancellationToken ct);
}

public class CatalogService(PhotoStudioDbContext db) : ICatalogService
{
    // ---------- Event types ----------

    public Task<List<EventTypeDto>> GetEventTypesAsync(bool includeInactive, CancellationToken ct) =>
        db.EventTypes.AsNoTracking()
            .Where(e => includeInactive || e.IsActive)
            .OrderBy(e => e.SortOrder).ThenBy(e => e.EventTypeName)
            .Select(e => new EventTypeDto(e.EventTypeId, e.EventTypeName, e.SortOrder, e.IsActive, e.Orders.Count, e.Packages.Count))
            .ToListAsync(ct);

    public async Task<EventTypeDto> CreateEventTypeAsync(SaveEventTypeRequest r, CancellationToken ct)
    {
        string name = r.EventTypeName.Trim();
        if (await db.EventTypes.AnyAsync(e => e.EventTypeName == name, ct))
            throw new ConflictException($"Event type '{name}' already exists.");

        var entity = new EventType { EventTypeName = name, SortOrder = r.SortOrder, IsActive = r.IsActive };
        db.EventTypes.Add(entity);
        await db.SaveChangesAsync(ct);
        return await GetEventTypeAsync(entity.EventTypeId, ct);
    }

    public async Task<EventTypeDto> UpdateEventTypeAsync(int id, SaveEventTypeRequest r, CancellationToken ct)
    {
        string name = r.EventTypeName.Trim();
        if (!await db.EventTypes.AnyAsync(e => e.EventTypeId == id, ct)) throw new NotFoundException("Event type", id);
        if (await db.EventTypes.AnyAsync(e => e.EventTypeName == name && e.EventTypeId != id, ct))
            throw new ConflictException($"Event type '{name}' already exists.");

        // Set-based update: renaming cascades to Orders/Packages in SQL (ON UPDATE CASCADE).
        await db.EventTypes.Where(e => e.EventTypeId == id).ExecuteUpdateAsync(s => s
            .SetProperty(e => e.EventTypeName, name)
            .SetProperty(e => e.SortOrder, r.SortOrder)
            .SetProperty(e => e.IsActive, r.IsActive), ct);
        return await GetEventTypeAsync(id, ct);
    }

    public async Task DeleteEventTypeAsync(int id, CancellationToken ct)
    {
        var e = await db.EventTypes.Include(x => x.Orders).Include(x => x.Packages).FirstOrDefaultAsync(x => x.EventTypeId == id, ct)
            ?? throw new NotFoundException("Event type", id);
        if (e.Orders.Count > 0 || e.Packages.Count > 0)
            throw new BusinessRuleException("This event type is used by orders or packages. Deactivate it instead of deleting.");
        db.EventTypes.Remove(e);
        await db.SaveChangesAsync(ct);
    }

    private async Task<EventTypeDto> GetEventTypeAsync(int id, CancellationToken ct) =>
        (await GetEventTypesAsync(true, ct)).First(e => e.EventTypeId == id);

    // ---------- Packages ----------

    public Task<List<PackageDto>> GetPackagesAsync(bool includeInactive, CancellationToken ct) =>
        db.Packages.AsNoTracking()
            .Where(p => includeInactive || p.IsActive)
            .OrderBy(p => p.EventType).ThenBy(p => p.PackageName)
            .Select(p => new PackageDto(p.PackageId, p.PackageName, p.EventType, p.BasePrice, p.Inclusions, p.IsActive))
            .ToListAsync(ct);

    public async Task<PackageDto> CreatePackageAsync(SavePackageRequest r, CancellationToken ct)
    {
        await ValidatePackageAsync(r, null, ct);
        var p = new Package();
        Apply(p, r);
        db.Packages.Add(p);
        await db.SaveChangesAsync(ct);
        return ToDto(p);
    }

    public async Task<PackageDto> UpdatePackageAsync(int id, SavePackageRequest r, CancellationToken ct)
    {
        var p = await db.Packages.FindAsync([id], ct) ?? throw new NotFoundException("Package", id);
        await ValidatePackageAsync(r, id, ct);
        Apply(p, r);   // existing orders keep their own PackageAmount; price changes only affect new orders
        await db.SaveChangesAsync(ct);
        return ToDto(p);
    }

    public async Task DeletePackageAsync(int id, CancellationToken ct)
    {
        var p = await db.Packages.FindAsync([id], ct) ?? throw new NotFoundException("Package", id);
        if (await db.Orders.AnyAsync(o => o.PackageId == id, ct))
            throw new BusinessRuleException("This package is used by existing orders. Deactivate it instead of deleting.");
        db.Packages.Remove(p);
        await db.SaveChangesAsync(ct);
    }

    private async Task ValidatePackageAsync(SavePackageRequest r, int? id, CancellationToken ct)
    {
        string name = r.PackageName.Trim();
        if (await db.Packages.AnyAsync(p => p.PackageName == name && p.PackageId != (id ?? 0), ct))
            throw new ConflictException($"A package named '{name}' already exists.");
        if (!string.IsNullOrEmpty(r.EventType) && !await db.EventTypes.AnyAsync(e => e.EventTypeName == r.EventType, ct))
            throw new BusinessRuleException($"Unknown event type '{r.EventType}'.");
    }

    private static void Apply(Package p, SavePackageRequest r)
    {
        p.PackageName = r.PackageName.Trim();
        p.EventType = string.IsNullOrWhiteSpace(r.EventType) ? null : r.EventType;
        p.BasePrice = r.BasePrice;
        p.Inclusions = r.Inclusions;
        p.IsActive = r.IsActive;
    }

    private static PackageDto ToDto(Package p) => new(p.PackageId, p.PackageName, p.EventType, p.BasePrice, p.Inclusions, p.IsActive);
}
