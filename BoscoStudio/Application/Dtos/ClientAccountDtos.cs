namespace BoscoStudio.Application.Dtos;

// ---------- Clients ----------

public record ClientListDto(
    int ClientId, string FullName, string Phone, string? WhatsAppNo, string? Email, string? Address, string? Notes, int OrderCount);

public class SaveClientRequest
{
    public string FullName { get; set; } = "";
    public string Phone { get; set; } = "";
    public string? WhatsAppNo { get; set; }
    public string? Email { get; set; }
    public string? Address { get; set; }
    public string? Notes { get; set; }
}

// ---------- Owner account ----------

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = "";
    public string NewPassword { get; set; } = "";
}

// ---------- Custom quotation / invoice line items ----------

public class DocumentLineRequest
{
    public string Description { get; set; } = "";
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
}
