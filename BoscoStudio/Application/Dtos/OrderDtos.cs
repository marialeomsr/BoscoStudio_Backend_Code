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
    IReadOnlyList<OrderDocumentRefDto> Documents,
    string TaxSplit, IReadOnlyList<TaxLineDto> TaxLines,
    string? CreatedBy, DateTime? UpdatedAt, string? UpdatedBy,
    decimal AlbumsTotal, decimal GrandTotal, decimal AlbumCost,
    bool IncludesPhoto, decimal PhotoAmount, bool IncludesVideo, decimal VideoAmount, bool IncludesAlbum, decimal AlbumAmount);

public record DeliverableDto(
    int OrderId, string SelectionMode, string SelectionStatus, string PhotoEditStatus,
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
    // The order is priced by its parts. Tick what the client is buying; each ticked part has an amount.
    // A null amount = the selected package's price for that part (0 when there is no package / the package lacks it).
    // The order's package amount is the sum of the ticked parts.
    public bool IncludePhoto { get; set; } = true;
    public decimal? PhotoAmount { get; set; }
    public bool IncludeVideo { get; set; }
    public decimal? VideoAmount { get; set; }
    public bool IncludeAlbum { get; set; }
    public decimal? AlbumAmount { get; set; }
    public decimal DiscountAmount { get; set; }
    /// <summary>Null = studio default tax %.</summary>
    public decimal? TaxPercent { get; set; }
    /// <summary>"Single" (one tax line) or "CGST+SGST" (the tax shown as two equal halves). The total is the same.</summary>
    public string TaxSplit { get; set; } = "Single";
    /// <summary>CGST rate when split (SGST = TaxPercent - CgstPercent). Null = equal halves.</summary>
    public decimal? CgstPercent { get; set; }
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
    public string SelectionMode { get; set; } = "Client Selection";
    public string SelectionStatus { get; set; } = "Not Started";
    public string PhotoEditStatus { get; set; } = "Not Started";
    public string TeaserEditStatus { get; set; } = "Not Started";
    public string FullFilmEditStatus { get; set; } = "Not Started";
    public string? CloudProvider { get; set; }
    public string? CloudLink { get; set; }
    public DateOnly? DeliveredOn { get; set; }
}
