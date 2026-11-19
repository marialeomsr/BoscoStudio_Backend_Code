using BoscoStudio.Domain.Entities;

namespace BoscoStudio.Application.Common;

/// <summary>
/// An order is priced by its parts (Photo / Video / Album). These helpers keep the stored part amounts, the order's
/// package amount (their sum) and the quotation / invoice lines in step.
/// </summary>
public static class OrderPricing
{
    /// <summary>The ticked parts as quotation / invoice lines, e.g. "Wedding Gold – Photography".</summary>
    public static List<(string Description, decimal Amount)> Lines(Order o)
    {
        string name = o.Package?.PackageName ?? o.EventType;
        var lines = new List<(string, decimal)>();
        if (o.IncludesPhoto) lines.Add(($"{name} – Photography", o.PhotoAmount));
        if (o.IncludesVideo) lines.Add(($"{name} – Videography", o.VideoAmount));
        if (o.IncludesAlbum) lines.Add(($"{name} – Album", o.AlbumAmount));
        if (lines.Count == 0) lines.Add(($"{name}", o.PackageAmount));   // an order priced as one lump sum
        return lines;
    }

    /// <summary>Sets the amount of each part and the package amount (their sum) from the request / the selected package.</summary>
    public static void Apply(Order o, Package? package, bool photo, decimal? photoAmount, bool video, decimal? videoAmount, bool album, decimal? albumAmount)
    {
        o.IncludesPhoto = photo;
        o.IncludesVideo = video;
        o.IncludesAlbum = album;
        o.PhotoAmount = photo ? photoAmount ?? package?.PhotoPrice ?? 0 : 0;
        o.VideoAmount = video ? videoAmount ?? package?.VideoPrice ?? 0 : 0;
        o.AlbumAmount = album ? albumAmount ?? package?.AlbumPrice ?? 0 : 0;
        o.PackageAmount = o.PhotoAmount + o.VideoAmount + o.AlbumAmount;
    }
}
