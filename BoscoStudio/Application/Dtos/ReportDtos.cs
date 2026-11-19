namespace BoscoStudio.Application.Dtos;

public record ReportPaymentRowDto(
    DateOnly PaymentDate, string OrderNumber, string ClientName, string PaymentType, string PaymentMode,
    decimal Amount, string? TransactionRef);

public record ReportExpenseRowDto(
    DateOnly ExpenseDate, string Source, string OrderNumber, string Category, string? Description, decimal Amount);

/// <summary>An order line of the report: the usual order summary plus everything the order has cost (expenses + album printing).</summary>
public record ReportOrderRowDto(
    int OrderId, string OrderNumber, string ClientName, string? ClientPhone, string EventType, string OrderStatus,
    DateOnly EventDate, string? Venue, decimal TotalAmount, decimal TotalPaid, decimal BalanceDue, decimal Expenses);

/// <summary>Who created an order and who last changed it. Times are UTC.</summary>
public record OrderActivityRowDto(
    int OrderId, string OrderNumber, string ClientName, string OrderStatus,
    DateTime CreatedAt, string? CreatedBy, DateTime? UpdatedAt, string? UpdatedBy);

/// <summary>Everything that happened between two dates: shoots, money in, money out, and who worked on the orders.</summary>
public record DateRangeReportDto(
    DateOnly From, DateOnly To,
    int OrderCount, decimal OrdersTotal,
    decimal Revenue, decimal Expenses, decimal NetProfit,
    IReadOnlyList<ReportOrderRowDto> Orders,
    IReadOnlyList<ReportPaymentRowDto> Payments,
    IReadOnlyList<ReportExpenseRowDto> ExpenseRows,
    IReadOnlyList<OrderActivityRowDto> Activity);
