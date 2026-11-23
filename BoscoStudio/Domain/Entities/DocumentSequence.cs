using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[PrimaryKey("StudioId", "DocumentType", "SeqYear")]
public partial class DocumentSequence : IStudioScoped
{
    /// <summary>The studio this row belongs to (stamped on save, filtered on every query).</summary>
    public int StudioId { get; set; }

    [Key]
    [StringLength(10)]
    public string DocumentType { get; set; } = null!;

    [Key]
    public int SeqYear { get; set; }

    public int LastNumber { get; set; }
}
