using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

/// <summary>Who signed in and out. Only owners who may manage owners can read it.</summary>
[Authorize]
[ApiController]
[Route("api/audit")]
public class AuditController(IAuditService audit) : ControllerBase
{
    [RequirePermission(AppPermissions.OwnersManage)]
    [HttpGet("logins")]
    public Task<List<LoginAuditDto>> Logins(
        [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? username, [FromQuery] string? eventType,
        [FromQuery] int take = 200, CancellationToken ct = default) =>
        audit.GetLoginHistoryAsync(from, to, username, eventType, take, ct);
}
