using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Infrastructure.Data;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IReportService
{
    Task<DateRangeReportDto> GetAsync(DateOnly from, DateOnly to, CancellationToken ct);
    Task<byte[]> ExportExcelAsync(DateOnly from, DateOnly to, CancellationToken ct);
}

public class ReportService(PhotoStudioDbContext db, IOrderService orders) : IReportService
{
    private const string Money = "#,##0.00";
    private const string DateFormat = "dd-mmm-yyyy";

    public async Task<DateRangeReportDto> GetAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        if (to < from) throw new BusinessRuleException("The end date cannot be before the start date.");

        // Shoots in the range (cancelled ones are left out), judged by event date.
        var summaries = (await orders.GetListAsync(null, from, to, null, ct))
            .Where(o => o.OrderStatus != OrderStatuses.Cancelled).ToList();

        // What each of those orders has cost in all (any date): order expenses + album printing.
        var ids = summaries.Select(o => o.OrderId).ToList();
        var orderExpenses = await db.Expenses.AsNoTracking().Where(e => ids.Contains(e.OrderId))
            .GroupBy(e => e.OrderId).Select(g => new { OrderId = g.Key, Sum = g.Sum(e => e.Amount) })
            .ToDictionaryAsync(x => x.OrderId, x => x.Sum, ct);
        var albumCosts = await db.Albums.AsNoTracking().Where(a => ids.Contains(a.OrderId))
            .GroupBy(a => a.OrderId).Select(g => new { OrderId = g.Key, Sum = g.Sum(a => a.PrintCost ?? 0) })
            .ToDictionaryAsync(x => x.OrderId, x => x.Sum, ct);
        var orderRows = summaries.Select(o => new ReportOrderRowDto(
            o.OrderId, o.OrderNumber, o.ClientName, o.ClientPhone, o.EventType, o.OrderStatus, o.EventDate, o.Venue,
            o.TotalAmount, o.TotalPaid, o.BalanceDue,
            orderExpenses.GetValueOrDefault(o.OrderId) + albumCosts.GetValueOrDefault(o.OrderId))).ToList();

        // Money received in the range, judged by payment date.
        var payments = await db.Payments.AsNoTracking()
            .Where(p => p.PaymentDate >= from && p.PaymentDate <= to)
            .OrderBy(p => p.PaymentDate).ThenBy(p => p.PaymentId)
            .Select(p => new ReportPaymentRowDto(
                p.PaymentDate, p.Order.OrderNumber, p.Order.Client.FullName, p.PaymentType, p.PaymentMode, p.Amount, p.TransactionRef))
            .ToListAsync(ct);

        // Money spent in the range: order expenses by expense date + album print costs by sent-to-print date.
        var expenses = await db.Expenses.AsNoTracking()
            .Where(e => e.ExpenseDate >= from && e.ExpenseDate <= to)
            .Select(e => new ReportExpenseRowDto(e.ExpenseDate, "Order", e.Order.OrderNumber, e.Category, e.Description, e.Amount))
            .ToListAsync(ct);
        var printCosts = await db.Albums.AsNoTracking()
            .Where(a => a.PrintCost != null && a.SentToPrintOn != null && a.SentToPrintOn >= from && a.SentToPrintOn <= to)
            .Select(a => new ReportExpenseRowDto(a.SentToPrintOn!.Value, "Album print", a.Order.OrderNumber, "Album print", null, a.PrintCost!.Value))
            .ToListAsync(ct);
        var expenseRows = expenses.Concat(printCosts).OrderBy(e => e.ExpenseDate).ToList();

        // Orders created or changed in the range (stored in UTC), newest activity first.
        var start = from.ToDateTime(TimeOnly.MinValue);
        var end = to.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var activity = await db.Orders.AsNoTracking()
            .Where(o => (o.CreatedAt >= start && o.CreatedAt < end) || (o.UpdatedAt >= start && o.UpdatedAt < end))
            .OrderByDescending(o => o.UpdatedAt ?? o.CreatedAt)
            .Select(o => new OrderActivityRowDto(
                o.OrderId, o.OrderNumber, o.Client.FullName, o.OrderStatus, o.CreatedAt, o.CreatedBy, o.UpdatedAt, o.UpdatedBy))
            .ToListAsync(ct);

        decimal revenue = payments.Sum(p => p.Amount);
        decimal spent = expenseRows.Sum(e => e.Amount);
        return new DateRangeReportDto(
            from, to, orderRows.Count, orderRows.Sum(o => o.TotalAmount),
            revenue, spent, revenue - spent, orderRows, payments, expenseRows, activity);
    }

    public async Task<byte[]> ExportExcelAsync(DateOnly from, DateOnly to, CancellationToken ct)
    {
        var r = await GetAsync(from, to, ct);
        using var wb = new XLWorkbook();

        // ----- Summary -----
        var s = wb.AddWorksheet("Summary");
        s.Cell(1, 1).Value = "Bosco Studio report";
        s.Cell(1, 1).Style.Font.SetBold().Font.SetFontSize(16);
        s.Cell(2, 1).Value = $"{r.From:dd MMM yyyy} to {r.To:dd MMM yyyy}";
        (string Label, XLCellValue Value, bool IsMoney)[] summary =
        [
            ("Orders (by event date)", r.OrderCount, false),
            ("Orders total", r.OrdersTotal, true),
            ("Revenue (payments received)", r.Revenue, true),
            ("Expenses", r.Expenses, true),
            ("Net profit", r.NetProfit, true),
        ];
        for (int i = 0; i < summary.Length; i++)
        {
            s.Cell(4 + i, 1).Value = summary[i].Label;
            s.Cell(4 + i, 2).Value = summary[i].Value;
            if (summary[i].IsMoney) s.Cell(4 + i, 2).Style.NumberFormat.Format = Money;
        }
        s.Range(4, 1, 4 + summary.Length - 1, 1).Style.Font.SetBold();
        s.Columns().AdjustToContents();

        // ----- Orders / Payments / Expenses -----
        Sheet(wb, "Orders",
            ["Event date", "Order no", "Client", "Phone", "Event type", "Status", "Venue", "Total", "Paid", "Balance", "Expenses"],
            r.Orders.Select(o => new object?[] { o.EventDate, o.OrderNumber, o.ClientName, o.ClientPhone, o.EventType, o.OrderStatus, o.Venue, o.TotalAmount, o.TotalPaid, o.BalanceDue, o.Expenses }),
            moneyCols: [8, 9, 10, 11]);
        Sheet(wb, "Payments",
            ["Date", "Order no", "Client", "Type", "Mode", "Amount", "Reference"],
            r.Payments.Select(p => new object?[] { p.PaymentDate, p.OrderNumber, p.ClientName, p.PaymentType, p.PaymentMode, p.Amount, p.TransactionRef }),
            moneyCols: [6]);
        Sheet(wb, "Expenses",
            ["Date", "Source", "Order no", "Category", "Description", "Amount"],
            r.ExpenseRows.Select(e => new object?[] { e.ExpenseDate, e.Source, e.OrderNumber, e.Category, e.Description, e.Amount }),
            moneyCols: [6]);
        Sheet(wb, "Order activity",
            ["Order no", "Client", "Status", "Created by", "Created at", "Last modified by", "Last modified at"],
            r.Activity.Select(a => new object?[]
            {
                a.OrderNumber, a.ClientName, a.OrderStatus, a.CreatedBy, Stamp(a.CreatedAt), a.UpdatedBy, a.UpdatedAt is null ? null : Stamp(a.UpdatedAt.Value)
            }),
            moneyCols: []);

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    /// <summary>A stored UTC time as readable local text (dates written as text keep Excel from reformatting them).</summary>
    private static string Stamp(DateTime utc) =>
        DateTime.SpecifyKind(utc, DateTimeKind.Utc).ToLocalTime().ToString("dd MMM yyyy, h:mm tt");

    /// <summary>One data sheet: bold frozen header, typed cells (dates stay dates, money stays numbers), total row for money columns.</summary>
    private static void Sheet(XLWorkbook wb, string name, string[] headers, IEnumerable<object?[]> rows, int[] moneyCols)
    {
        var ws = wb.AddWorksheet(name);
        for (int c = 0; c < headers.Length; c++) ws.Cell(1, c + 1).Value = headers[c];
        ws.Row(1).Style.Font.SetBold().Fill.SetBackgroundColor(XLColor.LightGray);

        int row = 2;
        foreach (var values in rows)
        {
            for (int c = 0; c < values.Length; c++)
            {
                var cell = ws.Cell(row, c + 1);
                switch (values[c])
                {
                    case null: break;
                    case DateOnly d: cell.Value = d.ToDateTime(TimeOnly.MinValue); cell.Style.DateFormat.Format = DateFormat; break;
                    case decimal m: cell.Value = m; cell.Style.NumberFormat.Format = Money; break;
                    // Text is always stored as text, so a value like "=cmd" can never run as a formula.
                    case string t: cell.SetValue(t); break;
                    default: cell.SetValue(values[c]!.ToString()); break;
                }
            }
            row++;
        }

        if (row > 2)
        {
            ws.Cell(row, 1).Value = "Total";
            foreach (int c in moneyCols)
            {
                var total = ws.Cell(row, c);
                total.FormulaA1 = $"SUM({ws.Cell(2, c).Address}:{ws.Cell(row - 1, c).Address})";
                total.Style.NumberFormat.Format = Money;
            }
            ws.Row(row).Style.Font.SetBold();
        }
        ws.SheetView.FreezeRows(1);
        ws.Columns().AdjustToContents();
    }
}
