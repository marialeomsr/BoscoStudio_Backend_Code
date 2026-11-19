using System.ComponentModel.DataAnnotations.Schema;

namespace BoscoStudio.Domain.Entities;

// Hand-written extension of the scaffolded Order entity.
// Lives OUTSIDE Domain/Entities so `dotnet ef dbcontext scaffold --force` never overwrites it.
// These need Payments / Expenses / Albums to be Include()d; list queries project sums in SQL instead.
//
// Money model: TotalAmount (SQL computed column) is the PHOTOSHOOT total incl. tax. Albums are sold separately
// (SellingPrice each) and added on top, so the client pays GrandTotal against one payment ledger.
// Costs are kept apart: TotalExpenses = order expenses only, AlbumCost = what print vendors charge.
public partial class Order
{
    [NotMapped] public decimal TotalPaid => Payments.Sum(p => p.Amount);
    [NotMapped] public decimal TotalExpenses => Expenses.Sum(e => e.Amount);
    [NotMapped] public decimal AlbumsTotal => Albums.Sum(a => a.SellingPrice);
    [NotMapped] public decimal AlbumCost => Albums.Sum(a => a.PrintCost ?? 0);
    /// <summary>Photoshoot total + albums: what the client has to pay in all.</summary>
    [NotMapped] public decimal GrandTotal => (TotalAmount ?? 0) + AlbumsTotal;
    [NotMapped] public decimal BalanceDue => GrandTotal - TotalPaid;
    /// <summary>Cash actually received minus every cost of delivering the order (expenses and album printing).</summary>
    [NotMapped] public decimal NetProfit => TotalPaid - TotalExpenses - AlbumCost;
}
