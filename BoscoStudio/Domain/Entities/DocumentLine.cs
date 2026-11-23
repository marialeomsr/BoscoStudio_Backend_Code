using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("DocumentId", Name = "IX_DocumentLines_DocumentId")]
public partial class DocumentLine : IStudioScoped
{
    /// <summary>The studio this row belongs to (stamped on save, filtered on every query).</summary>
    public int StudioId { get; set; }

    [Key]
    public int LineId { get; set; }

    public int DocumentId { get; set; }

    [StringLength(300)]
    public string Description { get; set; } = null!;

    [Column(TypeName = "decimal(9, 2)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal? LineTotal { get; set; }

    [ForeignKey("DocumentId")]
    [InverseProperty("DocumentLines")]
    public virtual Document Document { get; set; } = null!;
}
