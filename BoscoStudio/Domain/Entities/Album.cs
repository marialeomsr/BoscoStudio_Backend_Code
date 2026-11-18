using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("AlbumStage", Name = "IX_Albums_AlbumStage")]
[Index("OrderId", Name = "IX_Albums_OrderId")]
public partial class Album
{
    [Key]
    public int AlbumId { get; set; }

    public int OrderId { get; set; }

    [StringLength(60)]
    public string AlbumType { get; set; } = null!;

    public int SheetCount { get; set; }

    [StringLength(30)]
    public string AlbumStage { get; set; } = null!;

    [StringLength(120)]
    public string? PrintVendorName { get; set; }

    [StringLength(60)]
    public string? PrintVendorContact { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal? PrintCost { get; set; }

    public DateOnly? SentToPrintOn { get; set; }

    public DateOnly? ReceivedOn { get; set; }

    public DateOnly? HandedOverOn { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    [Precision(0)]
    public DateTime CreatedAt { get; set; }

    [Precision(0)]
    public DateTime? UpdatedAt { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("Albums")]
    public virtual Order Order { get; set; } = null!;
}
