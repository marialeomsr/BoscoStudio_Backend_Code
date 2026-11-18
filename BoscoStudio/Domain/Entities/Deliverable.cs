using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("OrderId", Name = "UQ_Deliverables_Order", IsUnique = true)]
public partial class Deliverable
{
    [Key]
    public int DeliverableId { get; set; }

    public int OrderId { get; set; }

    [StringLength(20)]
    public string RawBackupStatus { get; set; } = null!;

    [StringLength(20)]
    public string SelectionMode { get; set; } = null!;

    [StringLength(20)]
    public string SelectionStatus { get; set; } = null!;

    [StringLength(20)]
    public string PhotoEditStatus { get; set; } = null!;

    [StringLength(20)]
    public string TeaserEditStatus { get; set; } = null!;

    [StringLength(20)]
    public string FullFilmEditStatus { get; set; } = null!;

    [StringLength(20)]
    public string? CloudProvider { get; set; }

    [StringLength(500)]
    public string? CloudLink { get; set; }

    public DateOnly? DeliveredOn { get; set; }

    [Precision(0)]
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("Deliverable")]
    public virtual Order Order { get; set; } = null!;
}
