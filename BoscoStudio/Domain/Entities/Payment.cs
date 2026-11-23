using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("OrderId", Name = "IX_Payments_OrderId")]
[Index("PaymentDate", Name = "IX_Payments_PaymentDate")]
public partial class Payment : IStudioScoped
{
    /// <summary>The studio this row belongs to (stamped on save, filtered on every query).</summary>
    public int StudioId { get; set; }

    [Key]
    public int PaymentId { get; set; }

    public int OrderId { get; set; }

    [StringLength(30)]
    public string PaymentType { get; set; } = null!;

    [StringLength(20)]
    public string PaymentMode { get; set; } = null!;

    [Column(TypeName = "decimal(12, 2)")]
    public decimal Amount { get; set; }

    public DateOnly PaymentDate { get; set; }

    [StringLength(100)]
    public string? TransactionRef { get; set; }

    [StringLength(300)]
    public string? Notes { get; set; }

    [Precision(0)]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("Payments")]
    public virtual Order Order { get; set; } = null!;
}
