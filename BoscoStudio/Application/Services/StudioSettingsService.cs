using BoscoStudio.Application.Dtos;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IStudioSettingsService
{
    Task<StudioSettingsDto> GetAsync(CancellationToken ct);
    Task<StudioSettingsDto> UpdateAsync(UpdateStudioSettingsRequest request, CancellationToken ct);
}

/// <summary>The single StudioSettings row: everything printed in a quotation / invoice header and footer.</summary>
public class StudioSettingsService(PhotoStudioDbContext db) : IStudioSettingsService
{
    // The SuperAdmin has no studio of their own (and a studio may not have a row yet): show empty defaults instead of failing.
    public async Task<StudioSettingsDto> GetAsync(CancellationToken ct)
    {
        var s = await db.StudioSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        return s is null ? new StudioSettingsDto("", null, null, null, null, null, 0, "INV", "QTN", null, null, null) : ToDto(s);
    }

    public async Task<StudioSettingsDto> UpdateAsync(UpdateStudioSettingsRequest r, CancellationToken ct)
    {
        var s = await db.StudioSettings.FirstOrDefaultAsync(ct)
            ?? throw new BoscoStudio.Application.Common.BusinessRuleException("Studio details belong to a studio. Sign in as the studio's Owner (or open a studio) to edit them.");
        s.StudioName = r.StudioName.Trim();
        s.Tagline = Clean(r.Tagline);
        s.AddressLine = Clean(r.AddressLine);
        s.Phone = Clean(r.Phone);
        s.Email = Clean(r.Email);
        s.TaxRegistrationNo = Clean(r.TaxRegistrationNo);
        s.DefaultTaxPercent = r.DefaultTaxPercent;
        s.InvoicePrefix = r.InvoicePrefix.Trim().ToUpperInvariant();
        s.QuotationPrefix = r.QuotationPrefix.Trim().ToUpperInvariant();
        s.DefaultTerms = Clean(r.DefaultTerms);
        s.BankDetails = Clean(r.BankDetails);
        s.LogoUrl = Clean(r.LogoUrl);
        // the studio list / picker shows the same name
        string name = s.StudioName;
        if (await db.Studios.AnyAsync(x => x.StudioName == name && x.StudioId != s.StudioId, ct))
            throw new BoscoStudio.Application.Common.ConflictException($"A studio named '{name}' already exists.");
        var studio = await db.Studios.FirstAsync(x => x.StudioId == s.StudioId, ct);
        studio.StudioName = name;
        await db.SaveChangesAsync(ct);
        return ToDto(s);
    }

    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static StudioSettingsDto ToDto(Domain.Entities.StudioSetting s) => new(
        s.StudioName, s.Tagline, s.AddressLine, s.Phone, s.Email, s.TaxRegistrationNo, s.DefaultTaxPercent,
        s.InvoicePrefix, s.QuotationPrefix, s.DefaultTerms, s.BankDetails, s.LogoUrl);
}
