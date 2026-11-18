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

        // 1. Shoots, split by whether the shoot has happened (judged by status, not just date):
        //    upcoming  = still to be shot (Pre-Order / Pending / Confirmed), today .. +7 days
        //    completed = shot already (Shoot Completed / In Post-Production / Delivered), last 30 days .. +7 days
        var window = await orders.GetListAsync(null, today.AddDays(-30), today.AddDays(7), null, ct);
        string[] toShoot = [OrderStatuses.PreOrder, OrderStatuses.Pending, OrderStatuses.Confirmed];
        string[] shot = [OrderStatuses.ShootCompleted, OrderStatuses.InPostProduction, OrderStatuses.Delivered];

        var upcoming = window.Where(o => toShoot.Contains(o.OrderStatus) && o.EventDate >= today).OrderBy(o => o.EventDate).ToList();
        var completed = window.Where(o => shot.Contains(o.OrderStatus)).OrderByDescending(o => o.EventDate).ToList();

        // 2. Pending balances: live orders that are past the quote stage and still owe money.
        var balances = await db.Orders.AsNoTracking()
            .Where(o => o.OrderStatus != OrderStatuses.Cancelled && o.OrderStatus != OrderStatuses.PreOrder)
            .Select(o => (o.TotalAmount ?? 0) - o.Payments.Sum(p => p.Amount))
            .Where(b => b > 0)
            .ToListAsync(ct);

        // 2b. Overdue: still Confirmed although the shoot date has passed (probably never marked "Shoot Completed").
        var overdue = (await orders.GetListAsync(OrderStatuses.Confirmed, null, today.AddDays(-1), null, ct)).Take(10).ToList();

        // 2c. Balances to collect now: owing money and the shoot is within the next 7 days or already behind us.
        var due = (await db.Orders.AsNoTracking()
                .Where(o => o.OrderStatus != OrderStatuses.Cancelled && o.OrderStatus != OrderStatuses.PreOrder
                         && o.EventDate <= today.AddDays(7))
                .Select(o => new
                {
                    o.OrderId, o.OrderNumber, o.Client.FullName, o.Client.Phone, o.Client.WhatsAppNo, o.EventDate, o.OrderStatus,
                    Balance = (o.TotalAmount ?? 0) - o.Payments.Sum(p => p.Amount)
                })
                .Where(x => x.Balance > 0)
                .OrderBy(x => x.EventDate)
                .ToListAsync(ct))
            .Select(x => new DueBalanceDto(x.OrderId, x.OrderNumber, x.FullName, x.Phone, x.WhatsAppNo, x.EventDate, x.OrderStatus, x.Balance))
            .ToList();

        // 3. Albums where the owner must act next, plus the count in every stage (stuck-album strip).
        int albums = await db.Albums.CountAsync(a => AlbumStages.AwaitingOwner.Contains(a.AlbumStage), ct);
        var perStage = await db.Albums.AsNoTracking().GroupBy(a => a.AlbumStage)
            .Select(g => new { Stage = g.Key, Count = g.Count() }).ToListAsync(ct);
        var albumsByStage = AlbumStages.Pipeline
            .Select(s => new AlbumStageCountDto(s, perStage.FirstOrDefault(x => x.Stage == s)?.Count ?? 0)).ToList();

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
            upcoming.Count, upcoming.Take(5).ToList(), completed.Take(5).ToList(),
            balances.Sum(), balances.Count, albums,
            series[^1].Revenue, series[^1].Expenses, series,
            overdue, due.Take(8).ToList(), due.Count, due.Sum(d => d.BalanceDue), albumsByStage);
    }
}
