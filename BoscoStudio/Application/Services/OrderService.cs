using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Mapping;
using BoscoStudio.Domain.Entities;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IOrderService
{
    Task<List<OrderSummaryDto>> GetListAsync(string? status, DateOnly? from, DateOnly? to, string? search, CancellationToken ct);
    Task<List<CalendarItemDto>> GetCalendarAsync(DateOnly from, DateOnly to, CancellationToken ct);
    Task<OrderDetailDto> GetDetailAsync(int orderId, CancellationToken ct);
    Task<OrderDetailDto> CreateAsync(CreateOrderRequest request, CancellationToken ct);
    Task<OrderDetailDto> UpdateAsync(int orderId, UpdateOrderRequest request, CancellationToken ct);
    Task<OrderDetailDto> ChangeStatusAsync(int orderId, string newStatus, CancellationToken ct);
    Task<OrderDetailDto> UpdateDeliverableAsync(int orderId, UpdateDeliverableRequest request, CancellationToken ct);
    Task DeleteAsync(int orderId, CancellationToken ct);
}

public class OrderService(PhotoStudioDbContext db, DocumentNumberGenerator numbers) : IOrderService
{
    // ---------- Queries ----------

    public async Task<List<OrderSummaryDto>> GetListAsync(
        string? status, DateOnly? from, DateOnly? to, string? search, CancellationToken ct)
    {
        var query = db.Orders.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(o => o.OrderStatus == status);
        if (from is not null) query = query.Where(o => o.EventDate >= from);
        if (to is not null) query = query.Where(o => o.EventDate <= to);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(o => o.OrderNumber.Contains(search) || o.Client.FullName.Contains(search) || o.Client.Phone.Contains(search));

        return await query
            .OrderBy(o => o.EventDate)
            .Select(o => new OrderSummaryDto(
                o.OrderId, o.OrderNumber, o.Client.FullName, o.Client.Phone, o.EventType, o.OrderStatus,
                o.EventDate, o.Venue, o.TotalAmount ?? 0,
                o.Payments.Sum(p => p.Amount),
                (o.TotalAmount ?? 0) - o.Payments.Sum(p => p.Amount)))
            .ToListAsync(ct);
    }

    public Task<List<CalendarItemDto>> GetCalendarAsync(DateOnly from, DateOnly to, CancellationToken ct) =>
        db.OrderEventSlots.AsNoTracking()
            .Where(s => s.EventDate >= from && s.EventDate <= to && s.Order.OrderStatus != OrderStatuses.Cancelled)
            .OrderBy(s => s.EventDate).ThenBy(s => s.StartTime)
            .Select(s => new CalendarItemDto(
                s.OrderId, s.Order.OrderNumber, s.Order.Client.FullName, s.Order.EventType, s.Order.OrderStatus,
                s.EventDate, s.StartTime, s.EndTime, s.Title, s.Venue ?? s.Order.Venue))
            .ToListAsync(ct);

    public async Task<OrderDetailDto> GetDetailAsync(int orderId, CancellationToken ct) =>
        (await LoadOrderAsync(orderId, ct)).ToDetailDto();

    // ---------- Commands ----------

    public async Task<OrderDetailDto> CreateAsync(CreateOrderRequest request, CancellationToken ct)
    {
        await EnsureNoDoubleBookingAsync(request.Slots, ignoreOrderId: null, request.AllowOverlap, ct);

        var client = request.ClientId is int clientId
            ? await db.Clients.FindAsync([clientId], ct) ?? throw new NotFoundException("Client", clientId)
            : NewClient(request.NewClient!);

        var order = new Order
        {
            OrderNumber = await numbers.NextAsync("ORD", ct),
            Client = client,
            OrderStatus = request.InitialStatus
        };
        await ApplyEditableFieldsAsync(order, request, ct);

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        return await GetDetailAsync(order.OrderId, ct);
    }

    public async Task<OrderDetailDto> UpdateAsync(int orderId, UpdateOrderRequest request, CancellationToken ct)
    {
        var order = await LoadOrderAsync(orderId, ct);
        if (order.OrderStatus is OrderStatuses.Delivered or OrderStatuses.Cancelled)
            throw new BusinessRuleException($"A {order.OrderStatus} order can no longer be edited.");

        await EnsureNoDoubleBookingAsync(request.Slots, orderId, request.AllowOverlap, ct);

        db.OrderEventSlots.RemoveRange(order.OrderEventSlots);   // slots are replaced as a set
        order.OrderEventSlots.Clear();
        await ApplyEditableFieldsAsync(order, request, ct);
        order.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return await GetDetailAsync(orderId, ct);
    }

    public async Task<OrderDetailDto> ChangeStatusAsync(int orderId, string newStatus, CancellationToken ct)
    {
        var order = await LoadOrderAsync(orderId, ct);
        if (!OrderStatuses.CanMove(order.OrderStatus, newStatus))
            throw new BusinessRuleException($"Cannot move an order from '{order.OrderStatus}' to '{newStatus}'.");

        // Re-opening a cancelled order must not silently double-book the calendar.
        if (order.OrderStatus == OrderStatuses.Cancelled)
            await EnsureNoDoubleBookingAsync(
                order.OrderEventSlots.Select(s => new EventSlotRequest
                    { EventDate = s.EventDate, StartTime = s.StartTime, EndTime = s.EndTime }),
                orderId, allowOverlap: false, ct);

        order.OrderStatus = newStatus;
        order.UpdatedAt = DateTime.UtcNow;

        // The post-production checklist starts once the shoot is booked.
        if (newStatus is OrderStatuses.Confirmed or OrderStatuses.ShootCompleted or OrderStatuses.InPostProduction
            && order.Deliverable is null)
            order.Deliverable = new Deliverable();

        await db.SaveChangesAsync(ct);
        return await GetDetailAsync(orderId, ct);
    }

    public async Task<OrderDetailDto> UpdateDeliverableAsync(int orderId, UpdateDeliverableRequest r, CancellationToken ct)
    {
        var order = await LoadOrderAsync(orderId, ct);
        var d = order.Deliverable ??= new Deliverable();

        d.RawBackupStatus = r.RawBackupStatus;
        d.SelectionMode = r.SelectionMode;
        d.SelectionStatus = r.SelectionStatus;
        d.PhotoEditStatus = r.PhotoEditStatus;
        d.TeaserEditStatus = r.TeaserEditStatus;
        d.FullFilmEditStatus = r.FullFilmEditStatus;
        d.CloudProvider = r.CloudProvider;
        d.CloudLink = r.CloudLink;
        d.DeliveredOn = r.DeliveredOn;
        d.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return await GetDetailAsync(orderId, ct);
    }

    /// <summary>
    /// Deletes an order that has no money recorded. Albums, deliverables, schedule and quotations go with it
    /// (even if albums were added). With payments or an invoice the order must be Cancelled instead, to keep the books intact.
    /// </summary>
    public async Task DeleteAsync(int orderId, CancellationToken ct)
    {
        var order = await LoadOrderAsync(orderId, ct);
        if (order.Payments.Count > 0)
            throw new BusinessRuleException("This order has payments recorded. Cancel it instead of deleting.");
        if (order.Documents.Any(d => d.DocumentType == "Invoice"))
            throw new BusinessRuleException("This order has an invoice. Cancel it instead of deleting.");

        db.Documents.RemoveRange(order.Documents);   // quotations (their lines cascade in SQL)
        db.Expenses.RemoveRange(order.Expenses);
        db.Orders.Remove(order);                      // slots, deliverable and albums cascade in SQL
        await db.SaveChangesAsync(ct);
    }
    // ---------- Helpers ----------

    private async Task<Order> LoadOrderAsync(int orderId, CancellationToken ct) =>
        await db.Orders
            .Include(o => o.Client).Include(o => o.Package)
            .Include(o => o.OrderEventSlots).Include(o => o.Payments).Include(o => o.Expenses)
            .Include(o => o.Deliverable).Include(o => o.Albums).Include(o => o.Documents)
            .AsSplitQuery()
            .FirstOrDefaultAsync(o => o.OrderId == orderId, ct)
        ?? throw new NotFoundException("Order", orderId);

    private static Client NewClient(NewClientRequest n) => new()
    {
        FullName = n.FullName.Trim(), Phone = n.Phone.Trim(), WhatsAppNo = n.WhatsAppNo,
        Email = n.Email, Address = n.Address
    };

    /// <summary>Copies request fields onto the order and derives price, tax and first event date.</summary>
    private async Task ApplyEditableFieldsAsync(Order order, UpdateOrderRequest r, CancellationToken ct)
    {
        var package = r.PackageId is int pid
            ? await db.Packages.FindAsync([pid], ct) ?? throw new NotFoundException("Package", pid)
            : null;

        // Event type comes from the owner-managed EventTypes table (an inactive type is fine if the order already uses it).
        var eventType = await db.EventTypes.AsNoTracking().FirstOrDefaultAsync(e => e.EventTypeName == r.EventType, ct)
            ?? throw new BusinessRuleException($"Unknown event type '{r.EventType}'. Add it in Settings > Event types.");
        if (!eventType.IsActive && order.EventType != r.EventType)
            throw new BusinessRuleException($"Event type '{r.EventType}' is inactive.");
        if (package?.EventType is not null && package.EventType != r.EventType)
            throw new BusinessRuleException($"Package '{package.PackageName}' belongs to '{package.EventType}', not '{r.EventType}'.");

        order.PackageId = r.PackageId;
        order.EventType = r.EventType;
        order.Venue = r.Venue;
        order.Notes = r.Notes;
        order.PackageAmount = r.PackageAmount ?? package?.BasePrice ?? 0;
        order.DiscountAmount = r.DiscountAmount;
        order.TaxPercent = r.TaxPercent ?? (await db.StudioSettings.FirstOrDefaultAsync(ct))?.DefaultTaxPercent ?? 0;
        order.EventDate = r.Slots.Min(s => s.EventDate);

        foreach (var s in r.Slots)
            order.OrderEventSlots.Add(new OrderEventSlot
            {
                EventDate = s.EventDate, StartTime = s.StartTime, EndTime = s.EndTime, Title = s.Title, Venue = s.Venue
            });
    }

    /// <summary>Rejects a slot that overlaps another non-cancelled order's slot on the same date.</summary>
    private async Task EnsureNoDoubleBookingAsync(
        IEnumerable<EventSlotRequest> slots, int? ignoreOrderId, bool allowOverlap, CancellationToken ct)
    {
        if (allowOverlap) return;
        int ignore = ignoreOrderId ?? 0;

        foreach (var slot in slots)
        {
            var clash = await db.OrderEventSlots.AsNoTracking()
                .Where(s => s.OrderId != ignore
                         && s.Order.OrderStatus != OrderStatuses.Cancelled
                         && s.EventDate == slot.EventDate
                         && s.StartTime < slot.EndTime && s.EndTime > slot.StartTime)
                .Select(s => new { s.Order.OrderNumber, s.Order.Client.FullName, s.StartTime, s.EndTime })
                .FirstOrDefaultAsync(ct);

            if (clash is not null)
                throw new ConflictException(
                    $"{slot.EventDate:dd MMM yyyy} {slot.StartTime:HH\\:mm}-{slot.EndTime:HH\\:mm} overlaps " +
                    $"{clash.OrderNumber} ({clash.FullName}, {clash.StartTime:HH\\:mm}-{clash.EndTime:HH\\:mm}).");
        }
    }
}
