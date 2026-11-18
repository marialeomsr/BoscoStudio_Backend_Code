namespace BoscoStudio.Application.Common;

/// <summary>Order lifecycle. Strings must match CK_Orders_Status in PhotoStudioDB.sql.</summary>
public static class OrderStatuses
{
    public const string PreOrder = "Pre-Order";
    public const string Pending = "Pending";
    public const string Confirmed = "Confirmed";
    public const string ShootCompleted = "Shoot Completed";
    public const string InPostProduction = "In Post-Production";
    public const string Delivered = "Delivered";
    public const string Cancelled = "Cancelled";

    public static readonly string[] Pipeline =
        [PreOrder, Pending, Confirmed, ShootCompleted, InPostProduction, Delivered];

    public static readonly string[] All = [.. Pipeline, Cancelled];

    /// <summary>Forward (skipping allowed), one step back for corrections, Cancel any time before delivery, reopen Cancelled as Pending.</summary>
    public static bool CanMove(string from, string to)
    {
        if (from == to || from == Delivered) return false;
        if (from == Cancelled) return to == Pending;
        if (to == Cancelled) return true;

        int a = Array.IndexOf(Pipeline, from), b = Array.IndexOf(Pipeline, to);
        return a >= 0 && b >= 0 && (b > a || b == a - 1);
    }

    /// <summary>Orders that count as real work (revenue, balances, calendar blocking).</summary>
    public static bool IsActive(string status) => status != Cancelled;
}

/// <summary>Album stages in order. Strings must match CK_Albums_Stage.</summary>
public static class AlbumStages
{
    public static readonly string[] Pipeline =
    [
        "Photo Selection Pending", "Sheet Designing", "Client Proofing",
        "Sent to Print Lab", "Album Received", "Handed Over to Client"
    ];

    public const string SentToPrintLab = "Sent to Print Lab";
    public const string AlbumReceived = "Album Received";
    public const string HandedOver = "Handed Over to Client";

    /// <summary>Stages where the owner (not the vendor / client) has to act next.</summary>
    public static readonly string[] AwaitingOwner =
        ["Photo Selection Pending", "Sheet Designing", "Client Proofing", "Album Received"];
}

public static class PaymentTypes
{
    public static readonly string[] All = ["Booking Advance", "Shoot-Day Payment", "Final Delivery Balance", "Other"];
    public static readonly string[] Modes = ["UPI", "Bank Transfer", "Cash", "Card", "Cheque"];
}

public static class ExpenseCategories
{
    public static readonly string[] All =
        ["Second Shooter", "Equipment Rental", "Travel / Fuel", "Print Lab", "Assistant", "Food / Stay", "Other"];
}

public static class WorkStatuses
{
    public static readonly string[] All = ["Not Started", "In Progress", "Completed"];
}
