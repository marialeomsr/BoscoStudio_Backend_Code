using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("PackageName", Name = "UQ_Packages_Name", IsUnique = true)]
public partial class Package
{
    [Key]
    public int PackageId { get; set; }

    [StringLength(120)]
    public string PackageName { get; set; } = null!;

    [StringLength(30)]
    public string? EventType { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal BasePrice { get; set; }

    [StringLength(1000)]
    public string? Inclusions { get; set; }

    public bool IsActive { get; set; }

    [ForeignKey("EventType")]
    [InverseProperty("Packages")]
    public virtual EventType? EventTypeNavigation { get; set; }

    [InverseProperty("Package")]
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}
