using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IDashboardService
{
    Task<DashboardDto> GetAsync(CancellationToken ct);
}

public class DashboardService(PhotoStudioDbContext db, IOrderService orders) : IDashboardService
{
    public async Task<DashboardDto> GetAsync(CancellationToken ct)
    {
        var today = DateOnly.FromDateTime(DateTime.Today);
        var monthStart = new DateOnly(today.Year, today.Month, 1);

        // 1. Upcoming shoots: next 7 days (today inclusive), not cancelled.
        var upcoming = (await orders.GetListAsync(null, today, today.AddDays(7), null, ct))
            .Where(o => o.OrderStatus != OrderStatuses.Cancelled).ToList();

        // 2. Pending balances: live orders that are past the quote stage and still owe money.
        var balances = await db.Orders.AsNoTracking()
            .Where(o => o.OrderStatus != OrderStatuses.Cancelled && o.OrderStatus != OrderStatuses.PreOrder)
            .Select(o => (o.TotalAmount ?? 0) - o.Payments.Sum(p => p.Amount))
            .Where(b => b > 0)
            .ToListAsync(ct);

        // 3. Albums where the owner must act next.
        int albums = await db.Albums.CountAsync(a => AlbumStages.AwaitingOwner.Contains(a.AlbumStage), ct);

        // 4. Revenue (payments received) vs expenses (order expenses + album print costs by date) for 6 months.
        var from = monthStart.AddMonths(-5);
        var payments = await db.Payments.AsNoTracking().Where(p => p.PaymentDate >= from)
            .Select(p => new { p.PaymentDate, p.Amount }).ToListAsync(ct);
        var expenses = await db.Expenses.AsNoTracking().Where(e => e.ExpenseDate >= from)
            .Select(e => new { Date = e.ExpenseDate, e.Amount }).ToListAsync(ct);
        var printCosts = await db.Albums.AsNoTracking()
            .Where(a => a.PrintCost != null && a.SentToPrintOn != null && a.SentToPrintOn >= from)
            .Select(a => new { Date = a.SentToPrintOn!.Value, Amount = a.PrintCost!.Value }).ToListAsync(ct);

        var series = Enumerable.Range(0, 6).Select(i =>
        {
            var m = from.AddMonths(i);
            bool InMonth(DateOnly d) => d.Year == m.Year && d.Month == m.Month;
            return new MonthlyFinanceDto(
                m.ToString("MMM yyyy"),
                payments.Where(p => InMonth(p.PaymentDate)).Sum(p => p.Amount),
                expenses.Where(e => InMonth(e.Date)).Sum(e => e.Amount) + printCosts.Where(c => InMonth(c.Date)).Sum(c => c.Amount));
        }).ToList();

        return new DashboardDto(
            upcoming.Count, upcoming.Take(5).ToList(),
            balances.Sum(), balances.Count, albums,
            series[^1].Revenue, series[^1].Expenses, series);
    }
}
