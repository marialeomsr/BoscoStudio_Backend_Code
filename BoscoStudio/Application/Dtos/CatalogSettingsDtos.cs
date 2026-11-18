namespace BoscoStudio.Application.Dtos;

// ---------- Event types & packages (Settings > Catalog) ----------

public record EventTypeDto(int EventTypeId, string EventTypeName, int SortOrder, bool IsActive, int OrderCount, int PackageCount);

public class SaveEventTypeRequest
{
    public string EventTypeName { get; set; } = "";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class SavePackageRequest
{
    public string PackageName { get; set; } = "";
    /// <summary>Must be an existing event type; null = usable for any event.</summary>
    public string? EventType { get; set; }
    public decimal BasePrice { get; set; }
    public string? Inclusions { get; set; }
    public bool IsActive { get; set; } = true;
}

// ---------- Studio details printed on quotations / invoices ----------

public record StudioSettingsDto(
    string StudioName, string? Tagline, string? AddressLine, string? Phone, string? Email,
    string? TaxRegistrationNo, decimal DefaultTaxPercent, string InvoicePrefix, string QuotationPrefix,
    string? DefaultTerms, string? BankDetails, string? LogoUrl);

public class UpdateStudioSettingsRequest
{
    public string StudioName { get; set; } = "";
    public string? Tagline { get; set; }
    public string? AddressLine { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? TaxRegistrationNo { get; set; }
    public decimal DefaultTaxPercent { get; set; }
    public string InvoicePrefix { get; set; } = "INV";
    public string QuotationPrefix { get; set; } = "QTN";
    public string? DefaultTerms { get; set; }
    public string? BankDetails { get; set; }
    public string? LogoUrl { get; set; }
}

// ---------- Editing an issued quotation / invoice ----------

public class UpdateDocumentRequest
{
    public DateOnly? DueDate { get; set; }
    public string? Notes { get; set; }
    public string? Terms { get; set; }
    /// <summary>
    /// Null = keep the current items. When given, they replace the items and their total becomes the order's package amount
    /// (the order stays the single source of truth for price, discount, tax and balance).
    /// </summary>
    public List<DocumentLineRequest>? Lines { get; set; }
    /// <summary>Null = keep. Written through to the order (see <see cref="Lines"/>).</summary>
    public decimal? DiscountAmount { get; set; }
    /// <summary>Tax % (e.g. GST 18). Null = keep. Written through to the order.</summary>
    public decimal? TaxPercent { get; set; }
    /// <summary>"Single" or "CGST+SGST". Null = keep. Display only: the total never changes.</summary>
    public string? TaxSplit { get; set; }
    /// <summary>CGST rate when TaxSplit is CGST+SGST (SGST = TaxPercent - CgstPercent). Null = equal halves.</summary>
    public decimal? CgstPercent { get; set; }
}

public record OrderDocumentRefDto(int DocumentId, string DocumentType, string DocumentNumber);
