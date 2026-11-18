using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Domain.Entities;

public partial class StudioSetting
{
    [Key]
    public int StudioSettingsId { get; set; }

    [StringLength(150)]
    public string StudioName { get; set; } = null!;

    [StringLength(200)]
    public string? Tagline { get; set; }

    [StringLength(300)]
    public string? AddressLine { get; set; }

    [StringLength(30)]
    public string? Phone { get; set; }

    [StringLength(150)]
    public string? Email { get; set; }

    [StringLength(50)]
    public string? TaxRegistrationNo { get; set; }

    [Column(TypeName = "decimal(5, 2)")]
    public decimal DefaultTaxPercent { get; set; }

    [StringLength(10)]
    public string InvoicePrefix { get; set; } = null!;

    [StringLength(10)]
    public string QuotationPrefix { get; set; } = null!;

    public string? DefaultTerms { get; set; }

    [StringLength(500)]
    public string? BankDetails { get; set; }

    [StringLength(300)]
    public string? LogoUrl { get; set; }
}
