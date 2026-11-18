using System.Security.Claims;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Infrastructure.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IAuthService auth) : ControllerBase
{
    /// <summary>The only anonymous endpoint in the API.</summary>
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request, CancellationToken ct)
    {
        var result = await auth.LoginAsync(request, ct);
        return result is null ? Unauthorized(new ProblemDetails { Title = "Invalid username or password" }) : result;
    }

    /// <summary>Studio name and tagline for the sign-in page. Public, and exposes nothing about accounts.</summary>
    [AllowAnonymous]
    [HttpGet("branding")]
    public Task<BrandingDto> Branding(CancellationToken ct) => auth.GetBrandingAsync(ct);

    private int CurrentOwnerId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [Authorize]
    [HttpGet("me")]
    public Task<OwnerDto> Me(CancellationToken ct) => auth.GetProfileAsync(CurrentOwnerId, ct);

    /// <summary>Change own username / name / email. Returns a new token (the old one carries the old username).</summary>
    [Authorize]
    [HttpPut("profile")]
    public Task<LoginResponse> UpdateProfile(UpdateProfileRequest request, CancellationToken ct) =>
        auth.UpdateProfileAsync(CurrentOwnerId, request, ct);

    /// <summary>Changes the signed-in owner's password (needs the current one).</summary>
    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request, CancellationToken ct)
    {
        await auth.ChangePasswordAsync(CurrentOwnerId, request, ct);
        return NoContent();
    }
}
