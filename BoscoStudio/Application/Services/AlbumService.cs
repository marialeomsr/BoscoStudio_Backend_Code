using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Mapping;
using BoscoStudio.Domain.Entities;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IAlbumService
{
    /// <param name="awaitingOwnerOnly">Only albums where the owner has to act next (dashboard "albums awaiting action").</param>
    Task<List<AlbumDto>> GetListAsync(string? stage, bool awaitingOwnerOnly, CancellationToken ct);
    Task<AlbumDto> CreateAsync(int orderId, CreateAlbumRequest request, CancellationToken ct);
    Task<AlbumDto> UpdateAsync(int albumId, UpdateAlbumRequest request, CancellationToken ct);
    Task<AlbumDto> ChangeStageAsync(int albumId, string stage, CancellationToken ct);
    Task DeleteAsync(int albumId, CancellationToken ct);
}

public class AlbumService(PhotoStudioDbContext db) : IAlbumService
{
    public async Task<List<AlbumDto>> GetListAsync(string? stage, bool awaitingOwnerOnly, CancellationToken ct)
    {
        var query = db.Albums.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(stage)) query = query.Where(a => a.AlbumStage == stage);
        if (awaitingOwnerOnly) query = query.Where(a => AlbumStages.AwaitingOwner.Contains(a.AlbumStage));

        var rows = await query
            .OrderBy(a => a.Order.EventDate)
            .Select(a => new { Album = a, a.Order.OrderNumber, ClientName = a.Order.Client.FullName })
            .ToListAsync(ct);

        return rows.Select(r => r.Album.ToDto(r.OrderNumber, r.ClientName)).ToList();
    }

    public async Task<AlbumDto> CreateAsync(int orderId, CreateAlbumRequest r, CancellationToken ct)
    {
        var order = await db.Orders.Include(o => o.Client).FirstOrDefaultAsync(o => o.OrderId == orderId, ct)
            ?? throw new NotFoundException("Order", orderId);
        if (order.OrderStatus == OrderStatuses.Cancelled)
            throw new BusinessRuleException("Cannot add an album to a cancelled order.");

        // Albums can be added at any time (also after the order is Delivered): the client may only decide on an album later.
        await EnsureAlbumPackageAsync(r.PackageId, ct);
        EnsureNoDoublePricing(order, r.SellingPrice);
        var album = new Album { OrderId = orderId, AlbumStage = AlbumStages.Pipeline[0] };
        Apply(album, r);
        db.Albums.Add(album);
        await db.SaveChangesAsync(ct);
        return album.ToDto(order.OrderNumber, order.Client.FullName);
    }

    public async Task<AlbumDto> UpdateAsync(int albumId, UpdateAlbumRequest r, CancellationToken ct)
    {
        var album = await FindAsync(albumId, ct);
        await EnsureAlbumPackageAsync(r.PackageId, ct);
        EnsureNoDoublePricing(album.Order, r.SellingPrice);
        await EnsureTotalStillCoversPaymentsAsync(album.OrderId, r.SellingPrice - album.SellingPrice, ct);
        Apply(album, r);
        album.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return album.ToDto(album.Order.OrderNumber, album.Order.Client.FullName);
    }

    public async Task<AlbumDto> ChangeStageAsync(int albumId, string stage, CancellationToken ct)
    {
        var album = await FindAsync(albumId, ct);
        int current = Array.IndexOf(AlbumStages.Pipeline, album.AlbumStage);
        int target = Array.IndexOf(AlbumStages.Pipeline, stage);

        if (target < 0 || Math.Abs(target - current) != 1)
            throw new BusinessRuleException(
                $"An album can only move one stage at a time (from '{album.AlbumStage}').");

        if (stage == AlbumStages.SentToPrintLab && string.IsNullOrWhiteSpace(album.PrintVendorName))
            throw new BusinessRuleException("Enter the print vendor before sending the album to the print lab.");

        var today = DateOnly.FromDateTime(DateTime.Today);
        bool forward = target > current;

        // Stamp the milestone date of the stage being entered; when stepping back to fix a mistake,
        // clear the date of the stage being left.
        switch (forward ? stage : album.AlbumStage)
        {
            case AlbumStages.SentToPrintLab: album.SentToPrintOn = forward ? today : null; break;
            case AlbumStages.AlbumReceived: album.ReceivedOn = forward ? today : null; break;
            case AlbumStages.HandedOver: album.HandedOverOn = forward ? today : null; break;
        }

        album.AlbumStage = stage;
        album.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return album.ToDto(album.Order.OrderNumber, album.Order.Client.FullName);
    }

    public async Task DeleteAsync(int albumId, CancellationToken ct)
    {
        var album = await FindAsync(albumId, ct);
        if (album.AlbumStage is AlbumStages.SentToPrintLab or AlbumStages.AlbumReceived or AlbumStages.HandedOver)
            throw new BusinessRuleException("This album has already gone to print and cannot be deleted.");
        await EnsureTotalStillCoversPaymentsAsync(album.OrderId, -album.SellingPrice, ct);
        db.Albums.Remove(album);
        await db.SaveChangesAsync(ct);
    }

    private async Task<Album> FindAsync(int albumId, CancellationToken ct) =>
        await db.Albums.Include(a => a.Order).ThenInclude(o => o.Client)
            .FirstOrDefaultAsync(a => a.AlbumId == albumId, ct)
        ?? throw new NotFoundException("Album", albumId);

    /// <summary>The package, when given, must come from the album catalogue (not a photoshoot package).</summary>
    private async Task EnsureAlbumPackageAsync(int? packageId, CancellationToken ct)
    {
        if (packageId is null) return;
        var hasAlbum = await db.Packages.AsNoTracking().Where(p => p.PackageId == packageId).Select(p => (bool?)(p.AlbumPrice != null)).FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Package", packageId);
        if (!hasAlbum)
            throw new BusinessRuleException("That package has no Album part. Choose a package that includes an album.");
    }

    /// <summary>When the order's package already includes the Album part, its price is in the order total: an extra price would charge twice.</summary>
    private static void EnsureNoDoublePricing(Order order, decimal sellingPrice)
    {
        if (order.IncludesAlbum && sellingPrice > 0)
            throw new BusinessRuleException("The album is already included in this order's package price. Leave the selling price at 0, or untick Album on the order.");
    }

    /// <summary>Lowering or removing an album price must not leave the order's total below what the client already paid.</summary>
    private async Task EnsureTotalStillCoversPaymentsAsync(int orderId, decimal change, CancellationToken ct)
    {
        if (change >= 0) return;
        var t = await db.Orders.AsNoTracking().Where(o => o.OrderId == orderId)
            .Select(o => new { Shoot = o.TotalAmount ?? 0, Albums = o.Albums.Sum(a => a.SellingPrice), Paid = o.Payments.Sum(p => p.Amount) })
            .FirstAsync(ct);
        if (t.Shoot + t.Albums + change < t.Paid)
            throw new BusinessRuleException($"The order total would drop to {t.Shoot + t.Albums + change:N2}, below the {t.Paid:N2} already received.");
    }

    private static void Apply(Album album, CreateAlbumRequest r)
    {
        album.AlbumType = r.AlbumType.Trim();
        album.SellingPrice = r.SellingPrice;
        album.PackageId = r.PackageId;
        album.SheetCount = r.SheetCount;
        album.PrintVendorName = r.PrintVendorName;
        album.PrintVendorContact = r.PrintVendorContact;
        album.PrintCost = r.PrintCost;
        album.Notes = r.Notes;
    }
}
