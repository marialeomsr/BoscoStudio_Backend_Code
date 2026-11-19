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

public static class LoginEvents
{
    public const string Login = "Login";
    public const string Logout = "Logout";
    public const string LoginFailed = "LoginFailed";
}
