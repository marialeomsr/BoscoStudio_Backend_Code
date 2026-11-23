using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

/// <summary>Client studios. SuperAdmin only: create a studio (with its Owner login), rename, switch off, delete.</summary>
[Authorize(Roles = Roles.SuperAdmin)]
[ApiController]
[Route("api/studios")]
public class StudiosController(IStudioService studios) : ControllerBase
{
    [HttpGet]
    public Task<List<StudioDto>> List(CancellationToken ct) => studios.GetAllAsync(ct);

    [HttpPost]
    public async Task<ActionResult<StudioDto>> Create(CreateStudioRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await studios.CreateAsync(request, ct));

    [HttpPut("{studioId:int}")]
    public Task<StudioDto> Update(int studioId, UpdateStudioRequest request, CancellationToken ct) => studios.UpdateAsync(studioId, request, ct);

    [HttpDelete("{studioId:int}")]
    public async Task<IActionResult> Delete(int studioId, CancellationToken ct)
    {
        await studios.DeleteAsync(studioId, ct);
        return NoContent();
    }
}
