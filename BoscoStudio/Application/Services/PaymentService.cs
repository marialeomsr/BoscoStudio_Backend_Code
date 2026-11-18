using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Mapping;
using BoscoStudio.Domain.Entities;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

/// <summary>Money in (installment payments) and money out (order expenses) for one order.</summary>
public interface IPaymentService
{
    Task<List<PaymentDto>> GetPaymentsAsync(int orderId, CancellationToken ct);
    Task<PaymentDto> AddPaymentAsync(int orderId, CreatePaymentRequest request, CancellationToken ct);
    Task DeletePaymentAsync(int orderId, int paymentId, CancellationToken ct);
    Task<ExpenseDto> AddExpenseAsync(int orderId, CreateExpenseRequest request, CancellationToken ct);
    Task DeleteExpenseAsync(int orderId, int expenseId, CancellationToken ct);
}

public class PaymentService(PhotoStudioDbContext db) : IPaymentService
{
    public async Task<List<PaymentDto>> GetPaymentsAsync(int orderId, CancellationToken ct)
    {
        await EnsureOrderExistsAsync(orderId, ct);
        var payments = await db.Payments.AsNoTracking()
            .Where(p => p.OrderId == orderId)
            .OrderBy(p => p.PaymentDate).ThenBy(p => p.PaymentId)
            .ToListAsync(ct);
        return payments.Select(p => p.ToDto()).ToList();
    }

    public async Task<PaymentDto> AddPaymentAsync(int orderId, CreatePaymentRequest r, CancellationToken ct)
    {
        var order = await db.Orders.AsNoTracking()
            .Select(o => new { o.OrderId, o.OrderStatus, Total = o.TotalAmount ?? 0, Paid = o.Payments.Sum(p => p.Amount) })
            .FirstOrDefaultAsync(o => o.OrderId == orderId, ct)
            ?? throw new NotFoundException("Order", orderId);

        if (order.OrderStatus == OrderStatuses.Cancelled)
            throw new BusinessRuleException("Cannot record a payment against a cancelled order.");

        decimal balance = order.Total - order.Paid;
        if (r.Amount > balance)
            throw new BusinessRuleException($"Payment of {r.Amount:N2} exceeds the pending balance of {balance:N2}.");

        var payment = new Payment
        {
            OrderId = orderId,
            PaymentType = r.PaymentType,
            PaymentMode = r.PaymentMode,
            Amount = r.Amount,
            PaymentDate = r.PaymentDate ?? DateOnly.FromDateTime(DateTime.Today),
            TransactionRef = r.TransactionRef,
            Notes = r.Notes
        };
        db.Payments.Add(payment);
        await db.SaveChangesAsync(ct);
        return payment.ToDto();
    }

    public async Task DeletePaymentAsync(int orderId, int paymentId, CancellationToken ct)
    {
        var payment = await db.Payments.FirstOrDefaultAsync(p => p.PaymentId == paymentId && p.OrderId == orderId, ct)
            ?? throw new NotFoundException("Payment", paymentId);
        db.Payments.Remove(payment);
        await db.SaveChangesAsync(ct);
    }

    public async Task<ExpenseDto> AddExpenseAsync(int orderId, CreateExpenseRequest r, CancellationToken ct)
    {
        await EnsureOrderExistsAsync(orderId, ct);
        var expense = new Expense
        {
            OrderId = orderId,
            Category = r.Category,
            Description = r.Description,
            Amount = r.Amount,
            ExpenseDate = r.ExpenseDate ?? DateOnly.FromDateTime(DateTime.Today)
        };
        db.Expenses.Add(expense);
        await db.SaveChangesAsync(ct);
        return expense.ToDto();
    }

    public async Task DeleteExpenseAsync(int orderId, int expenseId, CancellationToken ct)
    {
        var expense = await db.Expenses.FirstOrDefaultAsync(e => e.ExpenseId == expenseId && e.OrderId == orderId, ct)
            ?? throw new NotFoundException("Expense", expenseId);
        db.Expenses.Remove(expense);
        await db.SaveChangesAsync(ct);
    }

    private async Task EnsureOrderExistsAsync(int orderId, CancellationToken ct)
    {
        if (!await db.Orders.AnyAsync(o => o.OrderId == orderId, ct))
            throw new NotFoundException("Order", orderId);
    }
}
