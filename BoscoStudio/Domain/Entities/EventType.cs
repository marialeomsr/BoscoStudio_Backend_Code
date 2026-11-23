using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("StudioId", "EventTypeName", Name = "UQ_EventTypes_Name", IsUnique = true)]
public partial class EventType : IStudioScoped
{
    /// <summary>The studio this row belongs to (stamped on save, filtered on every query).</summary>
    public int StudioId { get; set; }

    [Key]
    public int EventTypeId { get; set; }

    [StringLength(30)]
    public string EventTypeName { get; set; } = null!;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; }

    [InverseProperty("EventTypeNavigation")]
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    [InverseProperty("EventTypeNavigation")]
    public virtual ICollection<Package> Packages { get; set; } = new List<Package>();
}
