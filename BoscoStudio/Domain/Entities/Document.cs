using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("OrderId", Name = "IX_Documents_OrderId")]
[Index("DocumentNumber", Name = "UQ_Documents_Number", IsUnique = true)]
[Index("OrderId", "DocumentType", Name = "UX_Documents_OrderId_Type", IsUnique = true)]
public partial class Document
{
    [Key]
    public int DocumentId { get; set; }

    public int OrderId { get; set; }

    [StringLength(15)]
    public string DocumentType { get; set; } = null!;

    [StringLength(30)]
    public string DocumentNumber { get; set; } = null!;

    public DateOnly IssueDate { get; set; }

    public DateOnly? DueDate { get; set; }

    public string? Terms { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    [Precision(0)]
    public DateTime CreatedAt { get; set; }

    [InverseProperty("Document")]
    public virtual ICollection<DocumentLine> DocumentLines { get; set; } = new List<DocumentLine>();

    [ForeignKey("OrderId")]
    [InverseProperty("Documents")]
    public virtual Order Order { get; set; } = null!;
}
