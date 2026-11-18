using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

/// <summary>Installment payments and order expenses, always addressed through their order.</summary>
[Authorize]
[ApiController]
[Route("api/orders/{orderId:int}")]
public class PaymentsController(IPaymentService payments) : ControllerBase
{
    [HttpGet("payments")]
    public Task<List<PaymentDto>> ListPayments(int orderId, CancellationToken ct) =>
        payments.GetPaymentsAsync(orderId, ct);

    [HttpPost("payments")]
    public async Task<ActionResult<PaymentDto>> AddPayment(int orderId, CreatePaymentRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await payments.AddPaymentAsync(orderId, request, ct));

    [HttpDelete("payments/{paymentId:int}")]
    public async Task<IActionResult> DeletePayment(int orderId, int paymentId, CancellationToken ct)
    {
        await payments.DeletePaymentAsync(orderId, paymentId, ct);
        return NoContent();
    }

    [HttpPost("expenses")]
    public async Task<ActionResult<ExpenseDto>> AddExpense(int orderId, CreateExpenseRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await payments.AddExpenseAsync(orderId, request, ct));

    [HttpDelete("expenses/{expenseId:int}")]
    public async Task<IActionResult> DeleteExpense(int orderId, int expenseId, CancellationToken ct)
    {
        await payments.DeleteExpenseAsync(orderId, expenseId, ct);
        return NoContent();
    }
}
