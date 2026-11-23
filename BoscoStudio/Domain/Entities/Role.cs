using System.ComponentModel.DataAnnotations;

namespace BoscoStudio.Domain.Entities;

/// <summary>Role master. Permissions is the role's default set (comma separated, see AppPermissions); an owner can override it.</summary>
public class Role
{
    [Key]
    public int RoleId { get; set; }

    [StringLength(30)]
    public string RoleName { get; set; } = null!;

    [StringLength(200)]
    public string? Description { get; set; }

    [StringLength(500)]
    public string Permissions { get; set; } = "";

    /// <summary>Null = a shared role (managed by the SuperAdmin). A value = a custom role that studio's Owner made for that studio only.</summary>
    public int? StudioId { get; set; }

    /// <summary>System roles (SuperAdmin, Owner) cannot be renamed or deleted.</summary>
    public bool IsSystem { get; set; }
}
