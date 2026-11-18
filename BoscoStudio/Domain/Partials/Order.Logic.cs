using System.ComponentModel.DataAnnotations.Schema;

namespace BoscoStudio.Domain.Entities;

// Hand-written extension of the scaffolded Order entity.
// Lives OUTSIDE Domain/Entities so `dotnet ef dbcontext scaffold --force` never overwrites it.
// These need Payments / Expenses to be Include()d; list queries project sums in SQL instead.
public partial class Order
{
    [NotMapped] public decimal TotalPaid => Payments.Sum(p => p.Amount);
    [NotMapped] public decimal TotalExpenses => Expenses.Sum(e => e.Amount) + Albums.Sum(a => a.PrintCost ?? 0);
    [NotMapped] public decimal BalanceDue => (TotalAmount ?? 0) - TotalPaid;
    /// <summary>Cash actually received minus cost of delivering the order.</summary>
    [NotMapped] public decimal NetProfit => TotalPaid - TotalExpenses;
}
