using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

/// <summary>Dropdown data for the order form plus the all-orders payment ledger.</summary>
[Authorize]
[ApiController]
[Route("api")]
public class LookupsController(ILookupService lookups) : ControllerBase
{
    [HttpGet("clients")]
    public Task<List<ClientDto>> Clients([FromQuery] string? search, CancellationToken ct) =>
        lookups.SearchClientsAsync(search, ct);

    [HttpGet("settings/default-tax")]
    public Task<decimal> DefaultTax(CancellationToken ct) => lookups.GetDefaultTaxPercentAsync(ct);

    [HttpGet("payments")]
    public Task<List<PaymentLedgerItemDto>> PaymentLedger(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? mode, CancellationToken ct) =>
        lookups.GetPaymentLedgerAsync(from, to, mode, ct);
}
