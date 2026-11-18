using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

[Index("FullName", Name = "IX_Clients_FullName")]
[Index("Phone", Name = "IX_Clients_Phone")]
public partial class Client
{
    [Key]
    public int ClientId { get; set; }

    [StringLength(120)]
    public string FullName { get; set; } = null!;

    [StringLength(30)]
    public string Phone { get; set; } = null!;

    [StringLength(30)]
    public string? WhatsAppNo { get; set; }

    [StringLength(150)]
    public string? Email { get; set; }

    [StringLength(300)]
    public string? Address { get; set; }

    [StringLength(500)]
    public string? Notes { get; set; }

    [Precision(0)]
    public DateTime CreatedAt { get; set; }

    [InverseProperty("Client")]
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
}
