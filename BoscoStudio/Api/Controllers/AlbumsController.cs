using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

[Authorize]
[ApiController]
[Route("api")]
public class AlbumsController(IAlbumService albums) : ControllerBase
{
    [HttpGet("albums")]
    public Task<List<AlbumDto>> List(
        [FromQuery] string? stage, [FromQuery] bool awaitingOwnerOnly, CancellationToken ct) =>
        albums.GetListAsync(stage, awaitingOwnerOnly, ct);

    [RequirePermission(AppPermissions.AlbumsEdit)]
    [HttpPost("orders/{orderId:int}/albums")]
    public async Task<ActionResult<AlbumDto>> Create(int orderId, CreateAlbumRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await albums.CreateAsync(orderId, request, ct));

    [RequirePermission(AppPermissions.AlbumsEdit)]
    [HttpPut("albums/{albumId:int}")]
    public Task<AlbumDto> Update(int albumId, UpdateAlbumRequest request, CancellationToken ct) =>
        albums.UpdateAsync(albumId, request, ct);

    [RequirePermission(AppPermissions.AlbumsEdit)]
    [HttpPatch("albums/{albumId:int}/stage")]
    public Task<AlbumDto> ChangeStage(int albumId, ChangeAlbumStageRequest request, CancellationToken ct) =>
        albums.ChangeStageAsync(albumId, request.Stage, ct);

    [RequirePermission(AppPermissions.AlbumsDelete)]
    [HttpDelete("albums/{albumId:int}")]
    public async Task<IActionResult> Delete(int albumId, CancellationToken ct)
    {
        await albums.DeleteAsync(albumId, ct);
        return NoContent();
    }
}
