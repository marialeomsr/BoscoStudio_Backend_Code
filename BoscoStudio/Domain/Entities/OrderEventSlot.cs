using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("EventDate", "StartTime", Name = "IX_OrderEventSlots_EventDate")]
[Index("OrderId", Name = "IX_OrderEventSlots_OrderId")]
public partial class OrderEventSlot
{
    [Key]
    public int SlotId { get; set; }

    public int OrderId { get; set; }

    public DateOnly EventDate { get; set; }

    [Precision(0)]
    public TimeOnly StartTime { get; set; }

    [Precision(0)]
    public TimeOnly EndTime { get; set; }

    [StringLength(100)]
    public string? Title { get; set; }

    [StringLength(300)]
    public string? Venue { get; set; }

    [ForeignKey("OrderId")]
    [InverseProperty("OrderEventSlots")]
    public virtual Order Order { get; set; } = null!;
}
