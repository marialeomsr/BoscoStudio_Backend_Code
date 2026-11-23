using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

/// <summary>Login report: who signed in and out, across every studio. SuperAdmin only.</summary>
[Authorize(Roles = Roles.SuperAdmin)]
[ApiController]
[Route("api/audit")]
public class AuditController(IAuditService audit) : ControllerBase
{
    [HttpGet("logins")]
    public Task<List<LoginAuditDto>> Logins(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] int? studioId, [FromQuery] string? username,
        [FromQuery] string? eventType, [FromQuery] int take = 200, CancellationToken ct = default) =>
        audit.GetLoginHistoryAsync(from, to, studioId, username, eventType, take, ct);

    /// <summary>The same report with the same filters, downloaded as a CSV file.</summary>
    [HttpGet("logins/export")]
    public async Task<IActionResult> Export(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] int? studioId, [FromQuery] string? username,
        [FromQuery] string? eventType, CancellationToken ct = default) =>
        File(await audit.ExportLoginHistoryAsync(from, to, studioId, username, eventType, ct), "text/csv; charset=utf-8",
            $"login-report-{DateTime.UtcNow:yyyyMMdd-HHmm}.csv");
}
