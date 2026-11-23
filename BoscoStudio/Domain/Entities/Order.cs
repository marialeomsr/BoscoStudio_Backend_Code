using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("ClientId", Name = "IX_Orders_ClientId")]
[Index("EventDate", Name = "IX_Orders_EventDate")]
[Index("OrderStatus", Name = "IX_Orders_OrderStatus")]
[Index("StudioId", "OrderNumber", Name = "UQ_Orders_OrderNumber", IsUnique = true)]
public partial class Order : IStudioScoped
{
    /// <summary>The studio this row belongs to (stamped on save, filtered on every query).</summary>
    public int StudioId { get; set; }

    [Key]
    public int OrderId { get; set; }

    [StringLength(20)]
    public string OrderNumber { get; set; } = null!;

    public int ClientId { get; set; }

    public int? PackageId { get; set; }

    [StringLength(30)]
    public string EventType { get; set; } = null!;

    [StringLength(30)]
    public string OrderStatus { get; set; } = null!;

    public DateOnly EventDate { get; set; }

    [StringLength(300)]
    public string? Venue { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    // The parts chosen for this order and what each costs. PackageAmount is always their sum (set by OrderService).
    public bool IncludesPhoto { get; set; }

    public bool IncludesVideo { get; set; }

    public bool IncludesAlbum { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal PhotoAmount { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal VideoAmount { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal AlbumAmount { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal PackageAmount { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal DiscountAmount { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal TaxPercent { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal? TaxAmount { get; set; }

    [Column(TypeName = "decimal(12, 2)")]
    public decimal? TotalAmount { get; set; }

    [Precision(0)]
    public DateTime CreatedAt { get; set; }

    [Precision(0)]
    public DateTime? UpdatedAt { get; set; }

    /// <summary>Username of the owner who created the order (null for orders made before tracking existed).</summary>
    [StringLength(50)]
    public string? CreatedBy { get; set; }

    /// <summary>Username of the owner who last changed the order.</summary>
    [StringLength(50)]
    public string? UpdatedBy { get; set; }

    [StringLength(12)]
    public string TaxSplit { get; set; } = null!;

    /// <summary>CGST rate when the tax is split (SGST = TaxPercent - CgstPercent). Null = equal halves.</summary>
    [Column(TypeName = "decimal(5, 2)")]
    public decimal? CgstPercent { get; set; }

    [InverseProperty("Order")]
    public virtual ICollection<Album> Albums { get; set; } = new List<Album>();

    [ForeignKey("ClientId")]
    [InverseProperty("Orders")]
    public virtual Client Client { get; set; } = null!;

    [InverseProperty("Order")]
    public virtual Deliverable? Deliverable { get; set; }

    [InverseProperty("Order")]
    public virtual ICollection<Document> Documents { get; set; } = new List<Document>();

    [ForeignKey("EventType")]
    [InverseProperty("Orders")]
    public virtual EventType EventTypeNavigation { get; set; } = null!;

    [InverseProperty("Order")]
    public virtual ICollection<Expense> Expenses { get; set; } = new List<Expense>();

    [InverseProperty("Order")]
    public virtual ICollection<OrderEventSlot> OrderEventSlots { get; set; } = new List<OrderEventSlot>();

    [ForeignKey("PackageId")]
    [InverseProperty("Orders")]
    public virtual Package? Package { get; set; }

    [InverseProperty("Order")]
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
