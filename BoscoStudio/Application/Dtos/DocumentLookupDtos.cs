namespace BoscoStudio.Application.Dtos;

// ---------- Lookups (order form dropdowns) ----------

public record PackageDto(int PackageId, string PackageName, string? EventType, decimal BasePrice, string? Inclusions, bool IsActive);

// ---------- Payment ledger (all orders) ----------

public record PaymentLedgerItemDto(
    int PaymentId, int OrderId, string OrderNumber, string ClientName, string PaymentType, string PaymentMode,
    decimal Amount, DateOnly PaymentDate, string? TransactionRef);

// ---------- Quotations & invoices ----------

public record DocumentSummaryDto(
    int DocumentId, string DocumentNumber, string DocumentType, int OrderId, string OrderNumber, string ClientName,
    DateOnly IssueDate, decimal Total, decimal BalanceDue);

public record StudioInfoDto(
    string StudioName, string? Tagline, string? AddressLine, string? Phone, string? Email,
    string? TaxRegistrationNo, string? BankDetails, string? LogoUrl);

public record DocumentLineDto(string Description, decimal Quantity, decimal UnitPrice, decimal LineTotal);

/// <summary>Everything the print/PDF layout needs. Totals and payments are live from the order.</summary>
public record DocumentDetailDto(
    int DocumentId, string DocumentNumber, string DocumentType, DateOnly IssueDate, DateOnly? DueDate,
    string? Terms, string? Notes,
    StudioInfoDto Studio, ClientDto Client,
    int OrderId, string OrderNumber, string EventType, DateOnly EventDate, string? Venue,
    IReadOnlyList<DocumentLineDto> Lines,
    decimal Subtotal, decimal DiscountAmount, decimal TaxPercent, decimal TaxAmount, decimal Total,
    IReadOnlyList<PaymentDto> Payments, decimal TotalPaid, decimal BalanceDue);

public class CreateDocumentRequest
{
    /// <summary>"Quotation" or "Invoice".</summary>
    public string DocumentType { get; set; } = "Quotation";
    public DateOnly? DueDate { get; set; }
    public string? Notes { get; set; }
    /// <summary>Null = the studio's default terms.</summary>
    public string? Terms { get; set; }
}
