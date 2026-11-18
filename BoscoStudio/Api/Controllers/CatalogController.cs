using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

/// <summary>Event types, packages and studio details: everything the owner configures in Settings.</summary>
[Authorize]
[ApiController]
[Route("api")]
public class CatalogController(ICatalogService catalog, IStudioSettingsService studio) : ControllerBase
{
    // ----- Event types -----
    [HttpGet("event-types")]
    public Task<List<EventTypeDto>> EventTypes([FromQuery] bool includeInactive, CancellationToken ct) =>
        catalog.GetEventTypesAsync(includeInactive, ct);

    [RequirePermission(AppPermissions.SettingsManage)]
    [HttpPost("event-types")]
    public async Task<ActionResult<EventTypeDto>> CreateEventType(SaveEventTypeRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await catalog.CreateEventTypeAsync(request, ct));

    [RequirePermission(AppPermissions.SettingsManage)]
    [HttpPut("event-types/{id:int}")]
    public Task<EventTypeDto> UpdateEventType(int id, SaveEventTypeRequest request, CancellationToken ct) =>
        catalog.UpdateEventTypeAsync(id, request, ct);

    [RequirePermission(AppPermissions.SettingsManage)]
    [HttpDelete("event-types/{id:int}")]
    public async Task<IActionResult> DeleteEventType(int id, CancellationToken ct)
    {
        await catalog.DeleteEventTypeAsync(id, ct);
        return NoContent();
    }

    // ----- Packages -----
    [HttpGet("packages")]
    public Task<List<PackageDto>> Packages([FromQuery] bool includeInactive, CancellationToken ct) =>
        catalog.GetPackagesAsync(includeInactive, ct);

    [RequirePermission(AppPermissions.SettingsManage)]
    [HttpPost("packages")]
    public async Task<ActionResult<PackageDto>> CreatePackage(SavePackageRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await catalog.CreatePackageAsync(request, ct));

    [RequirePermission(AppPermissions.SettingsManage)]
    [HttpPut("packages/{id:int}")]
    public Task<PackageDto> UpdatePackage(int id, SavePackageRequest request, CancellationToken ct) =>
        catalog.UpdatePackageAsync(id, request, ct);

    [RequirePermission(AppPermissions.SettingsManage)]
    [HttpDelete("packages/{id:int}")]
    public async Task<IActionResult> DeletePackage(int id, CancellationToken ct)
    {
        await catalog.DeletePackageAsync(id, ct);
        return NoContent();
    }

    // ----- Studio details (printed on documents) -----
    [RequirePermission(AppPermissions.SettingsManage)]
    [HttpGet("settings/studio")]
    public Task<StudioSettingsDto> GetStudio(CancellationToken ct) => studio.GetAsync(ct);

    [RequirePermission(AppPermissions.SettingsManage)]
    [HttpPut("settings/studio")]
    public Task<StudioSettingsDto> UpdateStudio(UpdateStudioSettingsRequest request, CancellationToken ct) =>
        studio.UpdateAsync(request, ct);
}
