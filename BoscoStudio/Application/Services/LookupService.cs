using BoscoStudio.Application.Dtos;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface ILookupService
{
    Task<decimal> GetDefaultTaxPercentAsync(CancellationToken ct);
    Task<List<PaymentLedgerItemDto>> GetPaymentLedgerAsync(DateOnly? from, DateOnly? to, string? mode, CancellationToken ct);
}

/// <summary>Read-only helpers for dropdowns and cross-order lists.</summary>
public class LookupService(PhotoStudioDbContext db) : ILookupService
{
    public async Task<decimal> GetDefaultTaxPercentAsync(CancellationToken ct) =>
        (await db.StudioSettings.AsNoTracking().FirstOrDefaultAsync(ct))?.DefaultTaxPercent ?? 0;

    public Task<List<PaymentLedgerItemDto>> GetPaymentLedgerAsync(DateOnly? from, DateOnly? to, string? mode, CancellationToken ct) =>
        db.Payments.AsNoTracking()
            .Where(p => (from == null || p.PaymentDate >= from) && (to == null || p.PaymentDate <= to)
                     && (string.IsNullOrEmpty(mode) || p.PaymentMode == mode))
            .OrderByDescending(p => p.PaymentDate).ThenByDescending(p => p.PaymentId)
            .Select(p => new PaymentLedgerItemDto(
                p.PaymentId, p.OrderId, p.Order.OrderNumber, p.Order.Client.FullName, p.PaymentType, p.PaymentMode,
                p.Amount, p.PaymentDate, p.TransactionRef))
            .ToListAsync(ct);
}
