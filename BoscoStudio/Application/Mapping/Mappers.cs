using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Domain.Entities;

namespace BoscoStudio.Application.Mapping;

/// <summary>Explicit entity -> DTO mapping. No AutoMapper: every field is visible and greppable.</summary>
public static class Mappers
{
    public static ClientDto ToDto(this Client c) =>
        new(c.ClientId, c.FullName, c.Phone, c.WhatsAppNo, c.Email, c.Address);

    public static EventSlotDto ToDto(this OrderEventSlot s) =>
        new(s.SlotId, s.EventDate, s.StartTime, s.EndTime, s.Title, s.Venue);

    public static PaymentDto ToDto(this Payment p) =>
        new(p.PaymentId, p.OrderId, p.PaymentType, p.PaymentMode, p.Amount, p.PaymentDate, p.TransactionRef, p.Notes);

    public static ExpenseDto ToDto(this Expense e) =>
        new(e.ExpenseId, e.OrderId, e.Category, e.Description, e.Amount, e.ExpenseDate);

    public static DeliverableDto ToDto(this Deliverable d) =>
        new(d.OrderId, d.RawBackupStatus, d.SelectionMode, d.SelectionStatus, d.PhotoEditStatus,
            d.TeaserEditStatus, d.FullFilmEditStatus, d.CloudProvider, d.CloudLink, d.DeliveredOn);

    public static AlbumDto ToDto(this Album a, string? orderNumber = null, string? clientName = null) =>
        new(a.AlbumId, a.OrderId, orderNumber, clientName, a.AlbumType, a.SheetCount, a.AlbumStage,
            NextAlbumStage(a.AlbumStage), a.PrintVendorName, a.PrintVendorContact, a.PrintCost,
            a.SentToPrintOn, a.ReceivedOn, a.HandedOverOn, a.Notes);

    public static string? NextAlbumStage(string current)
    {
        int i = Array.IndexOf(AlbumStages.Pipeline, current);
        return i >= 0 && i < AlbumStages.Pipeline.Length - 1 ? AlbumStages.Pipeline[i + 1] : null;
    }

    /// <summary>Requires Client, Package, OrderEventSlots, Payments, Expenses, Deliverable, Albums, Documents to be loaded.</summary>
    public static OrderDetailDto ToDetailDto(this Order o) => new(
        o.OrderId, o.OrderNumber, o.OrderStatus, o.EventType, o.EventDate, o.Venue, o.Notes, o.CreatedAt,
        o.Client.ToDto(), o.PackageId, o.Package?.PackageName,
        o.PackageAmount, o.DiscountAmount, o.TaxPercent, o.TaxAmount ?? 0, o.TotalAmount ?? 0,
        o.TotalPaid, o.BalanceDue, o.TotalExpenses, o.NetProfit,
        o.OrderEventSlots.OrderBy(s => s.EventDate).ThenBy(s => s.StartTime).Select(s => s.ToDto()).ToList(),
        o.Payments.OrderBy(p => p.PaymentDate).ThenBy(p => p.PaymentId).Select(p => p.ToDto()).ToList(),
        o.Expenses.OrderBy(e => e.ExpenseDate).ThenBy(e => e.ExpenseId).Select(e => e.ToDto()).ToList(),
        o.Deliverable?.ToDto(),
        o.Albums.OrderBy(a => a.AlbumId).Select(a => a.ToDto(o.OrderNumber, o.Client.FullName)).ToList(),
        OrderStatuses.All.Where(s => OrderStatuses.CanMove(o.OrderStatus, s)).ToList(),
        o.Documents.OrderBy(d => d.DocumentId).Select(d => new OrderDocumentRefDto(d.DocumentId, d.DocumentType, d.DocumentNumber)).ToList(),
        o.TaxSplit, TaxSplits.Build(o.TaxPercent, o.TaxAmount ?? 0, o.TaxSplit, o.CgstPercent));
}
