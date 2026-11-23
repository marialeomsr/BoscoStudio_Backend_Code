using System;
using System.Collections.Generic;
using BoscoStudio.Application.Common;
using BoscoStudio.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Infrastructure.Data;

public partial class PhotoStudioDbContext : DbContext
{
    private readonly ICurrentStudio _studio;

    public PhotoStudioDbContext(DbContextOptions<PhotoStudioDbContext> options, ICurrentStudio studio)
        : base(options)
    {
        _studio = studio;
    }

    /// <summary>The studio the current request works in (read by the query filters; evaluated per query, per context).</summary>
    private int? CurrentStudioId => _studio.StudioId;

    public virtual DbSet<Album> Albums { get; set; }

    public virtual DbSet<Client> Clients { get; set; }

    public virtual DbSet<Deliverable> Deliverables { get; set; }

    public virtual DbSet<Document> Documents { get; set; }

    public virtual DbSet<DocumentLine> DocumentLines { get; set; }

    public virtual DbSet<DocumentSequence> DocumentSequences { get; set; }

    public virtual DbSet<EventType> EventTypes { get; set; }

    public virtual DbSet<Expense> Expenses { get; set; }

    public virtual DbSet<LoginAudit> LoginAudits { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderEventSlot> OrderEventSlots { get; set; }

    public virtual DbSet<OwnerAccount> OwnerAccounts { get; set; }

    public virtual DbSet<Package> Packages { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<StudioSetting> StudioSettings { get; set; }

    public virtual DbSet<Studio> Studios { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Album>(entity =>
        {
            entity.Property(e => e.AlbumStage).HasDefaultValue("Photo Selection Pending");
            entity.Property(e => e.SellingPrice).HasDefaultValue(0m);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Order).WithMany(p => p.Albums).HasConstraintName("FK_Albums_Orders");
        });

        modelBuilder.Entity<Client>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
        });

        modelBuilder.Entity<Deliverable>(entity =>
        {
            entity.Property(e => e.FullFilmEditStatus).HasDefaultValue("Not Started");
            entity.Property(e => e.PhotoEditStatus).HasDefaultValue("Not Started");
            entity.Property(e => e.SelectionMode).HasDefaultValue("Client Selection");
            entity.Property(e => e.SelectionStatus).HasDefaultValue("Not Started");
            entity.Property(e => e.TeaserEditStatus).HasDefaultValue("Not Started");

            entity.HasOne(d => d.Order).WithOne(p => p.Deliverable).HasConstraintName("FK_Deliverables_Orders");
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.IssueDate).HasDefaultValueSql("(CONVERT([date],sysutcdatetime()))");

            entity.HasOne(d => d.Order).WithMany(p => p.Documents)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Documents_Orders");
        });

        modelBuilder.Entity<DocumentLine>(entity =>
        {
            entity.Property(e => e.LineTotal).HasComputedColumnSql("(CONVERT([decimal](12,2),[Quantity]*[UnitPrice]))", true);
            entity.Property(e => e.Quantity).HasDefaultValue(1m);

            entity.HasOne(d => d.Document).WithMany(p => p.DocumentLines).HasConstraintName("FK_DocumentLines_Documents");
        });

        modelBuilder.Entity<EventType>(entity =>
        {
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.ExpenseDate).HasDefaultValueSql("(CONVERT([date],sysutcdatetime()))");

            entity.HasOne(d => d.Order).WithMany(p => p.Expenses)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Expenses_Orders");
        });

        modelBuilder.Entity<LoginAudit>(entity =>
        {
            entity.Property(e => e.OccurredAt).HasDefaultValueSql("(sysutcdatetime())");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.OrderStatus).HasDefaultValue("Pre-Order");
            entity.Property(e => e.TaxAmount).HasComputedColumnSql("(CONVERT([decimal](12,2),round((([PackageAmount]-[DiscountAmount])*[TaxPercent])/(100.0),(2))))", true);
            entity.Property(e => e.TaxSplit).HasDefaultValue("Single");
            entity.Property(e => e.TotalAmount).HasComputedColumnSql("(CONVERT([decimal](12,2),([PackageAmount]-[DiscountAmount])+round((([PackageAmount]-[DiscountAmount])*[TaxPercent])/(100.0),(2))))", true);

            entity.HasOne(d => d.Client).WithMany(p => p.Orders)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Orders_Clients");

            entity.HasOne(d => d.EventTypeNavigation).WithMany(p => p.Orders)
                .HasPrincipalKey(p => new { p.StudioId, p.EventTypeName })
                .HasForeignKey(d => new { d.StudioId, d.EventType })
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Orders_EventTypes");

            entity.HasOne(d => d.Package).WithMany(p => p.Orders).HasConstraintName("FK_Orders_Packages");
        });

        modelBuilder.Entity<OrderEventSlot>(entity =>
        {
            entity.HasOne(d => d.Order).WithMany(p => p.OrderEventSlots).HasConstraintName("FK_OrderEventSlots_Orders");
        });

        modelBuilder.Entity<OwnerAccount>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Role).HasDefaultValue("Staff");
        });

        modelBuilder.Entity<Package>(entity =>
        {
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasOne(d => d.EventTypeNavigation).WithMany(p => p.Packages)
                .HasPrincipalKey(p => new { p.StudioId, p.EventTypeName })
                .HasForeignKey(d => new { d.StudioId, d.EventType })
                .HasConstraintName("FK_Packages_EventTypes");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.PaymentDate).HasDefaultValueSql("(CONVERT([date],sysutcdatetime()))");

            entity.HasOne(d => d.Order).WithMany(p => p.Payments)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Payments_Orders");
        });

        modelBuilder.Entity<StudioSetting>(entity =>
        {
            entity.Property(e => e.StudioSettingsId).ValueGeneratedNever();
            entity.Property(e => e.InvoicePrefix).HasDefaultValue("INV");
            entity.Property(e => e.QuotationPrefix).HasDefaultValue("QTN");
        });

        modelBuilder.Entity<Studio>(entity =>
        {
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(sysutcdatetime())");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasIndex(e => e.RoleName).IsUnique();
            // shared roles are visible to everyone; a studio's own roles only to that studio
            entity.HasQueryFilter(e => e.StudioId == null || e.StudioId == CurrentStudioId);
        });

        // Multi-studio: every studio-owned table is filtered to the current studio, so no query can read another studio's rows.
        Scope<Album>(modelBuilder); Scope<Client>(modelBuilder); Scope<Deliverable>(modelBuilder); Scope<Document>(modelBuilder);
        Scope<DocumentLine>(modelBuilder); Scope<EventType>(modelBuilder); Scope<Expense>(modelBuilder); Scope<Order>(modelBuilder);
        Scope<OrderEventSlot>(modelBuilder); Scope<Package>(modelBuilder); Scope<Payment>(modelBuilder); Scope<StudioSetting>(modelBuilder);

        OnModelCreatingPartial(modelBuilder);
    }

    private void Scope<T>(ModelBuilder modelBuilder) where T : class, IStudioScoped =>
        modelBuilder.Entity<T>().HasQueryFilter(e => e.StudioId == CurrentStudioId);

    /// <summary>New rows get the current studio (unless the caller set one on purpose, e.g. when the SuperAdmin creates a studio).</summary>
    private void StampStudio()
    {
        foreach (var entry in ChangeTracker.Entries<IStudioScoped>().Where(e => e.State == EntityState.Added && e.Entity.StudioId == 0))
            entry.Entity.StudioId = _studio.StudioId ?? throw new BusinessRuleException("Choose a studio first.");
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        StampStudio();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        StampStudio();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
