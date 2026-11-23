using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("AlbumStage", Name = "IX_Albums_AlbumStage")]
[Index("OrderId", Name = "IX_Albums_OrderId")]
public partial class Album : IStudioScoped
{
    /// <summary>The studio this row belongs to (stamped on save, filtered on every query).</summary>
    public int StudioId { get; set; }

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

    /// <summary>What the client pays for this album (revenue, tax included). Part of the order's total payable.</summary>
    [Column(TypeName = "decimal(12, 2)")]
    public decimal SellingPrice { get; set; }

    /// <summary>The album package it was sold from (catalogue entry of type Album), if any.</summary>
    public int? PackageId { get; set; }

    /// <summary>What the print vendor charges the studio (cost of the album, not an order expense).</summary>
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
