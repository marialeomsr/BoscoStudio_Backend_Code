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

        var album = new Album { OrderId = orderId, AlbumStage = AlbumStages.Pipeline[0] };
        Apply(album, r);
        db.Albums.Add(album);
        await db.SaveChangesAsync(ct);
        return album.ToDto(order.OrderNumber, order.Client.FullName);
    }

    public async Task<AlbumDto> UpdateAsync(int albumId, UpdateAlbumRequest r, CancellationToken ct)
    {
        var album = await FindAsync(albumId, ct);
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
        db.Albums.Remove(album);
        await db.SaveChangesAsync(ct);
    }

    private async Task<Album> FindAsync(int albumId, CancellationToken ct) =>
        await db.Albums.Include(a => a.Order).ThenInclude(o => o.Client)
            .FirstOrDefaultAsync(a => a.AlbumId == albumId, ct)
        ?? throw new NotFoundException("Album", albumId);

    private static void Apply(Album album, CreateAlbumRequest r)
    {
        album.AlbumType = r.AlbumType.Trim();
        album.SheetCount = r.SheetCount;
        album.PrintVendorName = r.PrintVendorName;
        album.PrintVendorContact = r.PrintVendorContact;
        album.PrintCost = r.PrintCost;
        album.Notes = r.Notes;
    }
}
