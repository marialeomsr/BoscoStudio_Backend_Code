using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

/// <summary>Role master. Any signed-in login may read it (role dropdowns); adding, changing and deleting needs the logins permission (an Owner only touches their own studio's roles, see RoleService).</summary>
[Authorize]
[ApiController]
[Route("api/roles")]
public class RolesController(IRoleService roles) : ControllerBase
{
    [HttpGet]
    public Task<List<RoleDto>> List(CancellationToken ct) => roles.GetAllAsync(ct);

    [RequirePermission(AppPermissions.OwnersManage)]
    [HttpPost]
    public async Task<ActionResult<RoleDto>> Create(SaveRoleRequest request, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await roles.CreateAsync(request, ct));

    [RequirePermission(AppPermissions.OwnersManage)]
    [HttpPut("{roleId:int}")]
    public Task<RoleDto> Update(int roleId, SaveRoleRequest request, CancellationToken ct) => roles.UpdateAsync(roleId, request, ct);

    [RequirePermission(AppPermissions.OwnersManage)]
    [HttpDelete("{roleId:int}")]
    public async Task<IActionResult> Delete(int roleId, CancellationToken ct)
    {
        await roles.DeleteAsync(roleId, ct);
        return NoContent();
    }
}
