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
    public async Task<StudioSettingsDto> GetAsync(CancellationToken ct) => ToDto(await db.StudioSettings.AsNoTracking().FirstAsync(ct));

    public async Task<StudioSettingsDto> UpdateAsync(UpdateStudioSettingsRequest r, CancellationToken ct)
    {
        var s = await db.StudioSettings.FirstAsync(ct);
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
