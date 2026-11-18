namespace BoscoStudio.Application.Dtos;

// ---------- Payments & expenses ----------

public record PaymentDto(
    int PaymentId, int OrderId, string PaymentType, string PaymentMode, decimal Amount,
    DateOnly PaymentDate, string? TransactionRef, string? Notes);

public class CreatePaymentRequest
{
    public string PaymentType { get; set; } = "Booking Advance";
    public string PaymentMode { get; set; } = "UPI";
    public decimal Amount { get; set; }
    public DateOnly? PaymentDate { get; set; }
    public string? TransactionRef { get; set; }
    public string? Notes { get; set; }
}

public record ExpenseDto(int ExpenseId, int OrderId, string Category, string? Description, decimal Amount, DateOnly ExpenseDate);

public class CreateExpenseRequest
{
    public string Category { get; set; } = "Other";
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateOnly? ExpenseDate { get; set; }
}

// ---------- Albums ----------

public record AlbumDto(
    int AlbumId, int OrderId, string? OrderNumber, string? ClientName,
    string AlbumType, int SheetCount, string AlbumStage, string? NextStage,
    string? PrintVendorName, string? PrintVendorContact, decimal? PrintCost,
    DateOnly? SentToPrintOn, DateOnly? ReceivedOn, DateOnly? HandedOverOn, string? Notes);

public class CreateAlbumRequest
{
    public string AlbumType { get; set; } = "";
    public int SheetCount { get; set; }
    public string? PrintVendorName { get; set; }
    public string? PrintVendorContact { get; set; }
    public decimal? PrintCost { get; set; }
    public string? Notes { get; set; }
}

public class UpdateAlbumRequest : CreateAlbumRequest { }

public class ChangeAlbumStageRequest
{
    /// <summary>Must be the next stage (or the previous one, to undo a mistake).</summary>
    public string Stage { get; set; } = "";
}

// ---------- Dashboard ----------

public record MonthlyFinanceDto(string Month, decimal Revenue, decimal Expenses);

public record DashboardDto(
    int UpcomingShootCount,
    IReadOnlyList<OrderSummaryDto> UpcomingShoots,
    decimal PendingClientBalance,
    int OrdersWithBalance,
    int AlbumsAwaitingAction,
    decimal MonthRevenue,
    decimal MonthExpenses,
    IReadOnlyList<MonthlyFinanceDto> LastSixMonths);

// ---------- Auth ----------

public class LoginRequest
{
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
}

public record LoginResponse(string Token, DateTime ExpiresAtUtc, string FullName);
