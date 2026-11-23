using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("Username", Name = "UQ_OwnerAccounts_Username", IsUnique = true)]
public partial class OwnerAccount
{
    [Key]
    public int OwnerId { get; set; }

    [StringLength(50)]
    public string Username { get; set; } = null!;

    [StringLength(200)]
    public string PasswordHash { get; set; } = null!;

    [StringLength(100)]
    public string FullName { get; set; } = null!;

    [StringLength(150)]
    public string? Email { get; set; }

    [Precision(0)]
    public DateTime CreatedAt { get; set; }

    [StringLength(30)]
    public string Role { get; set; } = null!;

    /// <summary>Comma-separated permissions (see AppPermissions). Null = the role's preset.</summary>
    [StringLength(500)]
    public string? Permissions { get; set; }

    /// <summary>The studio this login belongs to. Null = SuperAdmin (every studio).</summary>
    public int? StudioId { get; set; }
}
