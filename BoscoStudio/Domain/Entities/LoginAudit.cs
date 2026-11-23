using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("OccurredAt", Name = "IX_LoginAudits_OccurredAt", IsDescending = [true])]
public partial class LoginAudit
{
    [Key]
    public long AuditId { get; set; }

    /// <summary>Null when the username entered does not exist.</summary>
    public int? OwnerId { get; set; }

    /// <summary>The studio of that login (null for the SuperAdmin or an unknown username).</summary>
    public int? StudioId { get; set; }

    [StringLength(50)]
    public string Username { get; set; } = null!;

    /// <summary>Login, Logout or LoginFailed (see LoginEvents).</summary>
    [StringLength(12)]
    public string EventType { get; set; } = null!;

    [Precision(0)]
    public DateTime OccurredAt { get; set; }

    [StringLength(45)]
    public string? IpAddress { get; set; }

    [StringLength(300)]
    public string? UserAgent { get; set; }
}
