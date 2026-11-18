using BoscoStudio.Application.Dtos;

namespace BoscoStudio.Application.Common;

/// <summary>
/// Owner roles. Capabilities:
/// Owner roles: Admin (everything, always) and the Manager / Staff starting presets. What each owner can actually do is in AppPermissions.
/// </summary>
public static class Roles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";
    public const string Staff = "Staff";


    public static readonly string[] All = [Admin, Manager, Staff];
}

/// <summary>How tax is printed on documents. The amount is identical either way.</summary>
public static class TaxSplits
{
    public const string Single = "Single";
    public const string CgstSgst = "CGST+SGST";

    public static readonly string[] All = [Single, CgstSgst];

    /// <summary>
    /// <paramref name="percent"/> is the TOTAL tax rate. With CGST+SGST, <paramref name="cgstPercent"/> is the CGST rate and SGST is the
    /// rest (null = equal halves, as older orders were saved). The two amounts always add up to <paramref name="taxAmount"/>.
    /// </summary>
    public static List<TaxLineDto> Build(decimal percent, decimal taxAmount, string split, decimal? cgstPercent = null)
    {
        if (percent == 0 && taxAmount == 0) return [];
        if (split != CgstSgst) return [new TaxLineDto("Tax", percent, taxAmount)];

        decimal cgstRate = cgstPercent is >= 0 && cgstPercent <= percent ? cgstPercent.Value : percent / 2m;
        decimal cgst = percent == 0 ? 0 : Math.Round(taxAmount * cgstRate / percent, 2, MidpointRounding.AwayFromZero);
        return [new TaxLineDto("CGST", cgstRate, cgst), new TaxLineDto("SGST", percent - cgstRate, taxAmount - cgst)];
    }
}
