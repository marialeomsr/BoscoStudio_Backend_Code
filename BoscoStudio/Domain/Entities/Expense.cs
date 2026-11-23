using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("ExpenseDate", Name = "IX_Expenses_ExpenseDate")]
[Index("OrderId", Name = "IX_Expenses_OrderId")]
public partial class Expense : IStudioScoped
{
    /// <summary>The studio this row belongs to (stamped on save, filtered on every query).</summary>
    public int StudioId { get; set; }

    [Key]
    public int ExpenseId { get; set; }

    public int OrderId { get; set; }

    [StringLength(30)]
    public string Category { get; set; } = null!;

    [StringLength(300)]
    public string? Description { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal Amount { get; set; }

    public DateOnly ExpenseDate { get; set; }

    [Precision(0)]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("Expenses")]
    public virtual Order Order { get; set; } = null!;
}
