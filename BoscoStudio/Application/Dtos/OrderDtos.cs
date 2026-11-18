namespace BoscoStudio.Application.Dtos;

// ---------- Responses ----------

public record ClientDto(int ClientId, string FullName, string Phone, string? WhatsAppNo, string? Email, string? Address);

public record EventSlotDto(int? SlotId, DateOnly EventDate, TimeOnly StartTime, TimeOnly EndTime, string? Title, string? Venue);

/// <summary>Row in order lists and the calendar.</summary>
public record OrderSummaryDto(
    int OrderId, string OrderNumber, string ClientName, string? ClientPhone, string EventType, string OrderStatus,
    DateOnly EventDate, string? Venue, decimal TotalAmount, decimal TotalPaid, decimal BalanceDue);

/// <summary>One calendar entry = one time slot of one order.</summary>
public record CalendarItemDto(
    int OrderId, string OrderNumber, string ClientName, string EventType, string OrderStatus,
    DateOnly EventDate, TimeOnly StartTime, TimeOnly EndTime, string? Title, string? Venue);

public record OrderDetailDto(
    int OrderId, string OrderNumber, string OrderStatus, string EventType, DateOnly EventDate,
    string? Venue, string? Notes, DateTime CreatedAt,
    ClientDto Client, int? PackageId, string? PackageName,
    decimal PackageAmount, decimal DiscountAmount, decimal TaxPercent, decimal TaxAmount, decimal TotalAmount,
    decimal TotalPaid, decimal BalanceDue, decimal TotalExpenses, decimal NetProfit,
    IReadOnlyList<EventSlotDto> Slots,
    IReadOnlyList<PaymentDto> Payments,
    IReadOnlyList<ExpenseDto> Expenses,
    DeliverableDto? Deliverable,
    IReadOnlyList<AlbumDto> Albums,
    IReadOnlyList<string> AllowedNextStatuses,
    IReadOnlyList<OrderDocumentRefDto> Documents);

public record DeliverableDto(
    int OrderId, string RawBackupStatus, string SelectionMode, string SelectionStatus, string PhotoEditStatus,
    string TeaserEditStatus, string FullFilmEditStatus, string? CloudProvider, string? CloudLink, DateOnly? DeliveredOn);

// ---------- Requests ----------

public class NewClientRequest
{
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string? WhatsAppNo { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
}

public class EventSlotRequest
{
    public DateOnly EventDate { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? Title { get; set; }
    public string? Venue { get; set; }
}

/// <summary>Editable order fields (also the base of the create request).</summary>
public class UpdateOrderRequest
{
    public int? PackageId { get; set; }
    public string EventType { get; set; } = "";
    public string? Venue { get; set; }
    public string? Notes { get; set; }
    /// <summary>Null = take the selected package's base price.</summary>
    public decimal? PackageAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    /// <summary>Null = studio default tax %.</summary>
    public decimal? TaxPercent { get; set; }
    public List<EventSlotRequest> Slots { get; set; } = [];
    /// <summary>Owner confirmed they accept an overlapping slot.</summary>
    public bool AllowOverlap { get; set; }
}

public class CreateOrderRequest : UpdateOrderRequest
{
    /// <summary>Existing client, or supply NewClient.</summary>
    public int? ClientId { get; set; }
    public NewClientRequest? NewClient { get; set; }
    /// <summary>Pre-Order (quote stage), Pending or Confirmed.</summary>
    public string InitialStatus { get; set; } = "Pre-Order";
}

public class ChangeOrderStatusRequest
{
    public string Status { get; set; } = "";
}

public class UpdateDeliverableRequest
{
    public string RawBackupStatus { get; set; } = "Not Started";
    public string SelectionMode { get; set; } = "Client Selection";
    public string SelectionStatus { get; set; } = "Not Started";
    public string PhotoEditStatus { get; set; } = "Not Started";
    public string TeaserEditStatus { get; set; } = "Not Started";
    public string FullFilmEditStatus { get; set; } = "Not Started";
    public string? CloudProvider { get; set; }
    public string? CloudLink { get; set; }
    public DateOnly? DeliveredOn { get; set; }
}
