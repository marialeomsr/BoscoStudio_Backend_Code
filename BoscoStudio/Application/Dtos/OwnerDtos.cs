namespace BoscoStudio.Application.Dtos;

// ---------- Owner accounts (several people can sign in to the same studio) ----------

public record OwnerDto(int OwnerId, string Username, string FullName, string? Email, string Role, DateTime CreatedAt, bool IsCurrent, IReadOnlyList<string> Permissions, int? StudioId, string? StudioName);

public class CreateOwnerRequest
{
    public string Username { get; set; } = "";
    public string FullName { get; set; } = "";
    public string? Email { get; set; }
    public string Password { get; set; } = "";
    /// <summary>Admin (everything), Manager (no settings / owners), Staff (day-to-day work, no deletes or invoicing).</summary>
    public string Role { get; set; } = "Staff";
    /// <summary>Null = the role's preset.</summary>
    public List<string>? Permissions { get; set; }
}

/// <summary>Own profile. The current password is required because the username is the sign-in name.</summary>
public class UpdateProfileRequest
{
    public string Username { get; set; } = "";
    public string FullName { get; set; } = "";
    public string? Email { get; set; }
    public string CurrentPassword { get; set; } = "";
}

/// <summary>An Admin editing another owner's sign-in details. A blank NewPassword leaves the password unchanged.</summary>
public class UpdateOwnerRequest
{
    public string Username { get; set; } = "";
    public string FullName { get; set; } = "";
    public string? Email { get; set; }
    public string? NewPassword { get; set; }
    /// <summary>The owner's permissions (ignored for Admins, who have everything). Null = leave unchanged.</summary>
    public List<string>? Permissions { get; set; }
}

/// <summary>Studio name + tagline shown on the sign-in page (public: no account data).</summary>
public record BrandingDto(string StudioName, string? Tagline);

public class UpdateOwnerRoleRequest
{
    public string Role { get; set; } = "Staff";
}

/// <summary>An owner setting a new password for another owner (e.g. a forgotten one).</summary>
public class ResetOwnerPasswordRequest
{
    public string NewPassword { get; set; } = "";
}
