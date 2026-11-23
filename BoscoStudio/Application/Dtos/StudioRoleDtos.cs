namespace BoscoStudio.Application.Dtos;

// ---------- Studios (SuperAdmin) ----------

public record StudioDto(int StudioId, string StudioName, bool IsActive, DateTime CreatedAt, int UserCount, int OrderCount);

/// <summary>A new client studio together with its first (Owner) login.</summary>
public class CreateStudioRequest
{
    public string StudioName { get; set; } = "";
    public string OwnerUsername { get; set; } = "";
    public string OwnerFullName { get; set; } = "";
    public string? OwnerEmail { get; set; }
    public string OwnerPassword { get; set; } = "";
}

public class UpdateStudioRequest
{
    public string StudioName { get; set; } = "";
    public bool IsActive { get; set; } = true;
}

// ---------- Role master (SuperAdmin) ----------

/// <summary>StudioId null = shared role (SuperAdmin only may change it); otherwise it belongs to that one studio.</summary>
public record RoleDto(int RoleId, string RoleName, string? Description, IReadOnlyList<string> Permissions, bool IsSystem, int UserCount, int? StudioId);

public class SaveRoleRequest
{
    public string RoleName { get; set; } = "";
    public string? Description { get; set; }
    /// <summary>The permissions a new login with this role starts with.</summary>
    public List<string>? Permissions { get; set; } = [];
    /// <summary>SuperAdmin only: true = a role for the studio in scope only; false = a shared role for every studio. Owners always create studio roles.</summary>
    public bool ForThisStudio { get; set; }
}

