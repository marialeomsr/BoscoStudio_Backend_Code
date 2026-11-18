using System.Security.Claims;
using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

/// <summary>Owner accounts and roles. Admin only.</summary>
[RequirePermission(AppPermissions.OwnersManage)]
[ApiController]
[Route("api/owners")]
public class OwnersController(IOwnerService owners) : ControllerBase
{
    private int CurrentOwnerId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public Task<List<OwnerDto>> List(CancellationToken ct) => owners.GetAllAsync(CurrentOwnerId, ct);

    [HttpPost]
    public async Task<ActionResult<OwnerDto>> Create(CreateOwnerRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await owners.CreateAsync(request, CurrentOwnerId, ct));

    /// <summary>Edit another owner's username, name, email and (optionally) password.</summary>
    [HttpPut("{ownerId:int}")]
    public Task<OwnerDto> Update(int ownerId, UpdateOwnerRequest request, CancellationToken ct) =>
        owners.UpdateAsync(ownerId, request, CurrentOwnerId, ct);

    [HttpPut("{ownerId:int}/role")]
    public Task<OwnerDto> ChangeRole(int ownerId, UpdateOwnerRoleRequest request, CancellationToken ct) =>
        owners.ChangeRoleAsync(ownerId, request.Role, CurrentOwnerId, ct);

    [HttpDelete("{ownerId:int}")]
    public async Task<IActionResult> Delete(int ownerId, CancellationToken ct)
    {
        await owners.DeleteAsync(ownerId, CurrentOwnerId, ct);
        return NoContent();
    }

    [HttpPut("{ownerId:int}/password")]
    public async Task<IActionResult> ResetPassword(int ownerId, ResetOwnerPasswordRequest request, CancellationToken ct)
    {
        await owners.ResetPasswordAsync(ownerId, CurrentOwnerId, request.NewPassword, ct);
        return NoContent();
    }
}
