using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/orders")]
public class OrdersController(IOrderService orders) : ControllerBase
{
    [HttpGet]
    public Task<List<OrderSummaryDto>> List(
        [FromQuery] string? status, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to,
        [FromQuery] string? search, CancellationToken ct) =>
        orders.GetListAsync(status, from, to, search, ct);

    /// <summary>Calendar feed: one item per time slot between two dates (Month / Week / Day views filter client-side).</summary>
    [HttpGet("calendar")]
    public Task<List<CalendarItemDto>> Calendar([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct) =>
        orders.GetCalendarAsync(from, to, ct);

    [HttpGet("{orderId:int}")]
    public Task<OrderDetailDto> Get(int orderId, CancellationToken ct) => orders.GetDetailAsync(orderId, ct);

    [RequirePermission(AppPermissions.OrdersEdit)]
    [HttpPost]
    public async Task<ActionResult<OrderDetailDto>> Create(CreateOrderRequest request, CancellationToken ct)
    {
        var created = await orders.CreateAsync(request, ct);
        return CreatedAtAction(nameof(Get), new { orderId = created.OrderId }, created);
    }

    [RequirePermission(AppPermissions.OrdersEdit)]
    [HttpPut("{orderId:int}")]
    public Task<OrderDetailDto> Update(int orderId, UpdateOrderRequest request, CancellationToken ct) =>
        orders.UpdateAsync(orderId, request, ct);

    [RequirePermission(AppPermissions.OrdersEdit)]
    [HttpPatch("{orderId:int}/status")]
    public Task<OrderDetailDto> ChangeStatus(int orderId, ChangeOrderStatusRequest request, CancellationToken ct) =>
        orders.ChangeStatusAsync(orderId, request.Status, ct);

    [RequirePermission(AppPermissions.OrdersEdit)]
    [HttpPut("{orderId:int}/deliverables")]
    public Task<OrderDetailDto> UpdateDeliverables(int orderId, UpdateDeliverableRequest request, CancellationToken ct) =>
        orders.UpdateDeliverableAsync(orderId, request, ct);

    [RequirePermission(AppPermissions.OrdersDelete)]
    [HttpDelete("{orderId:int}")]
    public async Task<IActionResult> Delete(int orderId, CancellationToken ct)
    {
        await orders.DeleteAsync(orderId, ct);
        return NoContent();
    }
}
