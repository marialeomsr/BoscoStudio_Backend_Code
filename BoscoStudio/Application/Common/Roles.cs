using BoscoStudio.Application.Dtos;

namespace BoscoStudio.Application.Common;

/// <summary>
/// Role names the code itself relies on. The full list of roles (and each role's default permissions) lives in the Roles master table,
/// which the SuperAdmin maintains; SuperAdmin and Owner are system roles and always exist.
/// </summary>
public static class Roles
{
    /// <summary>Platform administrator: no studio of their own, creates studios and logins, sees every studio, owns the options and roles.</summary>
    public const string SuperAdmin = "SuperAdmin";
    /// <summary>The studio's owner login (what used to be "Admin").</summary>
    public const string Owner = "Owner";
    public const string Staff = "Staff";
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

