using System.ComponentModel.DataAnnotations;

namespace BoscoStudio.Domain.Entities;

/// <summary>One client studio. Created by the SuperAdmin; its owner / staff logins only ever see its own data.</summary>
public class Studio
{
    [Key]
    public int StudioId { get; set; }

    [StringLength(150)]
    public string StudioName { get; set; } = null!;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; }
}
