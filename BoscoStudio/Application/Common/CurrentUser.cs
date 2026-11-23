using System.Security.Claims;

namespace BoscoStudio.Application.Common;

/// <summary>The owner making the current request (from the JWT), so services can stamp who did what.</summary>
public interface ICurrentUser
{
    /// <summary>Username of the signed-in owner, or null outside a request.</summary>
    string? Username { get; }
}

public class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string? Username => accessor.HttpContext?.User.FindFirstValue(ClaimTypes.Name);
}

/// <summary>
/// Which studio the current request works in. A studio login is tied to its own studio (JWT claim) and cannot choose another.
/// The SuperAdmin has no studio of their own and picks one per request with the X-Studio-Id header.
/// </summary>
public interface ICurrentStudio
{
    /// <summary>The studio in scope, or null (nothing is visible then).</summary>
    int? StudioId { get; }

    bool IsSuperAdmin { get; }
}

public class CurrentStudio(IHttpContextAccessor accessor) : ICurrentStudio
{
    public const string ClaimType = "studio";
    public const string HeaderName = "X-Studio-Id";

    public bool IsSuperAdmin => accessor.HttpContext?.User.IsInRole(Roles.SuperAdmin) == true;

    public int? StudioId
    {
        get
        {
            var ctx = accessor.HttpContext;
            if (ctx?.User.Identity?.IsAuthenticated != true) return null;
            string? raw = IsSuperAdmin ? ctx.Request.Headers[HeaderName].FirstOrDefault() : ctx.User.FindFirstValue(ClaimType);
            return int.TryParse(raw, out int id) && id > 0 ? id : null;
        }
    }
}

public static class LoginEvents
{
    public const string Login = "Login";
    public const string Logout = "Logout";
    public const string LoginFailed = "LoginFailed";
}
