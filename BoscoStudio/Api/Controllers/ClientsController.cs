using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/clients")]
public class ClientsController(IClientService clients) : ControllerBase
{
    [HttpGet]
    public Task<List<ClientListDto>> List([FromQuery] string? search, CancellationToken ct) =>
        clients.GetListAsync(search, ct);

    [RequirePermission(AppPermissions.ClientsEdit)]
    [HttpPost]
    public async Task<ActionResult<ClientListDto>> Create(SaveClientRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await clients.CreateAsync(request, ct));

    [RequirePermission(AppPermissions.ClientsEdit)]
    [HttpPut("{clientId:int}")]
    public Task<ClientListDto> Update(int clientId, SaveClientRequest request, CancellationToken ct) =>
        clients.UpdateAsync(clientId, request, ct);

    [RequirePermission(AppPermissions.ClientsDelete)]
    [HttpDelete("{clientId:int}")]
    public async Task<IActionResult> Delete(int clientId, CancellationToken ct)
    {
        await clients.DeleteAsync(clientId, ct);
        return NoContent();
    }
}
