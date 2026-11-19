using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Mapping;
using BoscoStudio.Domain.Entities;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IDocumentService
{
    Task<List<DocumentSummaryDto>> GetListAsync(string? type, CancellationToken ct);
    Task<DocumentDetailDto> GetAsync(int documentId, CancellationToken ct);
    Task<DocumentDetailDto> CreateAsync(int orderId, CreateDocumentRequest request, CancellationToken ct);
    Task<DocumentDetailDto> UpdateAsync(int documentId, UpdateDocumentRequest request, CancellationToken ct);
}

public class DocumentService(PhotoStudioDbContext db, DocumentNumberGenerator numbers) : IDocumentService
{
    private static readonly string[] InvoiceableStatuses =
        [OrderStatuses.Confirmed, OrderStatuses.ShootCompleted, OrderStatuses.InPostProduction, OrderStatuses.Delivered];

    public Task<List<DocumentSummaryDto>> GetListAsync(string? type, CancellationToken ct) =>
        db.Documents.AsNoTracking()
            .Where(d => type == null || type == "" || d.DocumentType == type)
            .OrderByDescending(d => d.DocumentId)
            .Select(d => new DocumentSummaryDto(
                d.DocumentId, d.DocumentNumber, d.DocumentType, d.OrderId, d.Order.OrderNumber, d.Order.Client.FullName,
                d.IssueDate, (d.Order.TotalAmount ?? 0) + d.Order.Albums.Sum(a => a.SellingPrice),
                (d.Order.TotalAmount ?? 0) + d.Order.Albums.Sum(a => a.SellingPrice) - d.Order.Payments.Sum(p => p.Amount)))
            .ToListAsync(ct);

    public async Task<DocumentDetailDto> GetAsync(int documentId, CancellationToken ct)
    {
        var d = await db.Documents.AsNoTracking()
            .Include(x => x.DocumentLines)
            .Include(x => x.Order).ThenInclude(o => o.Client)
            .Include(x => x.Order).ThenInclude(o => o.Payments)
            .Include(x => x.Order).ThenInclude(o => o.Albums)
            .AsSplitQuery()
            .FirstOrDefaultAsync(x => x.DocumentId == documentId, ct)
            ?? throw new NotFoundException("Document", documentId);

        var s = await db.StudioSettings.AsNoTracking().FirstAsync(ct);
        var o = d.Order;
        var lines = d.DocumentLines.OrderBy(l => l.LineId)
            .Select(l => new DocumentLineDto(l.Description, l.Quantity, l.UnitPrice, l.LineTotal ?? l.Quantity * l.UnitPrice))
            .ToList();

        return new DocumentDetailDto(
            d.DocumentId, d.DocumentNumber, d.DocumentType, d.IssueDate, d.DueDate, d.Terms, d.Notes,
            new StudioInfoDto(s.StudioName, s.Tagline, s.AddressLine, s.Phone, s.Email, s.TaxRegistrationNo, s.BankDetails, s.LogoUrl),
            o.Client.ToDto(), o.OrderId, o.OrderNumber, o.EventType, o.EventDate, o.Venue,
            lines, o.PackageAmount, o.DiscountAmount, o.TaxPercent, o.TaxAmount ?? 0, o.TotalAmount ?? 0,
            o.Payments.OrderBy(p => p.PaymentDate).ThenBy(p => p.PaymentId).Select(p => p.ToDto()).ToList(),
            o.TotalPaid, o.BalanceDue,
            o.TaxSplit, TaxSplits.Build(o.TaxPercent, o.TaxAmount ?? 0, o.TaxSplit, o.CgstPercent),
            // Albums are sold separately from the photoshoot: listed on their own, on top of the photoshoot total.
            o.Albums.Where(a => a.SellingPrice > 0).OrderBy(a => a.AlbumId)
                .Select(a => new DocumentLineDto($"Album: {a.AlbumType} ({a.SheetCount} sheets)", 1, a.SellingPrice, a.SellingPrice)).ToList(),
            o.AlbumsTotal, o.GrandTotal);
    }

    public async Task<DocumentDetailDto> UpdateAsync(int documentId, UpdateDocumentRequest r, CancellationToken ct)
    {
        var doc = await db.Documents.Include(d => d.DocumentLines)
            .Include(d => d.Order).ThenInclude(o => o.Payments)
            .Include(d => d.Order).ThenInclude(o => o.Albums)
            .FirstOrDefaultAsync(d => d.DocumentId == documentId, ct)
            ?? throw new NotFoundException("Document", documentId);

        doc.DueDate = r.DueDate;
        doc.Notes = string.IsNullOrWhiteSpace(r.Notes) ? null : r.Notes.Trim();
        doc.Terms = string.IsNullOrWhiteSpace(r.Terms) ? null : r.Terms.Trim();

        var order = doc.Order;
        bool linesGiven = r.Lines is { Count: > 0 };
        bool discountChanged = r.DiscountAmount.HasValue && r.DiscountAmount.Value != order.DiscountAmount;
        bool taxChanged = r.TaxPercent.HasValue && r.TaxPercent.Value != order.TaxPercent;
        if (linesGiven || discountChanged || taxChanged)
            await ApplyPricingAsync(doc, linesGiven ? r.Lines : null, r.DiscountAmount, r.TaxPercent, ct);
        if (r.TaxSplit is not null)   // display only, the total is unaffected
        {
            order.TaxSplit = r.TaxSplit;
            order.CgstPercent = r.TaxSplit == TaxSplits.CgstSgst ? r.CgstPercent : null;
        }
        else if (taxChanged) order.CgstPercent = null;   // the old CGST rate no longer fits the new total
        if (order.CgstPercent > order.TaxPercent) throw new BusinessRuleException("CGST cannot be more than the total tax %.");

        await db.SaveChangesAsync(ct);
        return await GetAsync(documentId, ct);
    }

    /// <summary>
    /// Items, discount and tax % edited on a quotation / invoice. The order stays the single source of truth for totals and
    /// balance, so these are written through to the order (and every document of that order shows the same figures):
    /// the items' total becomes the package amount, and discount / tax % become the order's.
    /// Other single-item documents of the order follow the new amount.
    /// </summary>
    private async Task ApplyPricingAsync(
        Document doc, List<DocumentLineRequest>? lines, decimal? discountAmount, decimal? taxPercent, CancellationToken ct)
    {
        var order = doc.Order;
        if (order.OrderStatus is OrderStatuses.Cancelled or OrderStatuses.Delivered)
            throw new BusinessRuleException($"The price of a {order.OrderStatus} order can no longer be changed.");

        decimal subtotal = lines is null ? order.PackageAmount : lines.Sum(l => Math.Round(l.Quantity * l.UnitPrice, 2));
        decimal discount = discountAmount ?? order.DiscountAmount;
        decimal pct = taxPercent ?? order.TaxPercent;

        if (discount > subtotal)
            throw new BusinessRuleException($"The discount {discount:N2} is higher than the items total {subtotal:N2}.");

        decimal net = subtotal - discount;
        decimal newTotal = net + Math.Round(net * pct / 100m, 2);
        if (newTotal + order.AlbumsTotal < order.TotalPaid)
            throw new BusinessRuleException($"The new total {newTotal + order.AlbumsTotal:N2} is lower than the {order.TotalPaid:N2} already received.");

        if (lines is not null)
        {
            db.DocumentLines.RemoveRange(doc.DocumentLines);
            doc.DocumentLines.Clear();
            foreach (var l in lines)
                doc.DocumentLines.Add(new DocumentLine { Description = l.Description.Trim(), Quantity = l.Quantity, UnitPrice = l.UnitPrice });

            var others = await db.Documents.Include(d => d.DocumentLines)
                .Where(d => d.OrderId == order.OrderId && d.DocumentId != doc.DocumentId).ToListAsync(ct);
            foreach (var other in others.Where(o => o.DocumentLines.Count == 1))
            {
                var line = other.DocumentLines.First();
                line.Quantity = 1;
                line.UnitPrice = subtotal;
            }
        }

        if (subtotal != order.PackageAmount)
        {
            // The owner re-priced the items freely, so they no longer map to Photo / Video / Album: keep the order's
            // parts consistent by recording the new total as one lump sum (shown as Photo).
            order.IncludesPhoto = true; order.IncludesVideo = false; order.IncludesAlbum = false;
            order.PhotoAmount = subtotal; order.VideoAmount = 0; order.AlbumAmount = 0;
        }
        order.PackageAmount = subtotal;
        order.DiscountAmount = discount;
        order.TaxPercent = pct;
        order.UpdatedAt = DateTime.UtcNow;
    }

    public async Task<DocumentDetailDto> CreateAsync(int orderId, CreateDocumentRequest r, CancellationToken ct)
    {
        var order = await db.Orders.Include(o => o.Package).Include(o => o.Documents).ThenInclude(d => d.DocumentLines)
            .FirstOrDefaultAsync(o => o.OrderId == orderId, ct)
            ?? throw new NotFoundException("Order", orderId);

        if (order.OrderStatus == OrderStatuses.Cancelled)
            throw new BusinessRuleException("Cannot issue a document for a cancelled order.");

        bool isInvoice = r.DocumentType == "Invoice";
        if (isInvoice)
        {
            if (!InvoiceableStatuses.Contains(order.OrderStatus))
                throw new BusinessRuleException("An invoice can be issued once the order is Confirmed. Use a quotation before that.");
        }

        // One quotation and one invoice per order (also enforced by a unique index): edit the existing one instead.
        var existing = order.Documents.FirstOrDefault(d => d.DocumentType == r.DocumentType);
        if (existing is not null)
            throw new ConflictException($"This order already has {existing.DocumentNumber}. Open it to edit.");

        var settings = await db.StudioSettings.FirstAsync(ct);
        var doc = new Document
        {
            OrderId = orderId,
            DocumentType = r.DocumentType,
            DocumentNumber = await numbers.NextAsync(isInvoice ? settings.InvoicePrefix : settings.QuotationPrefix, ct),
            IssueDate = DateOnly.FromDateTime(DateTime.Today),
            DueDate = r.DueDate,
            Terms = string.IsNullOrWhiteSpace(r.Terms) ? settings.DefaultTerms : r.Terms,
            Notes = r.Notes
        };
        // Start from the order's other document (e.g. the quotation's agreed items) so the invoice matches it;
        // otherwise a single line for the package. Items always add up to the order's package amount.
        var template = order.Documents.FirstOrDefault(d => d.DocumentLines.Count > 0);
        if (template is not null)
            foreach (var l in template.DocumentLines.OrderBy(l => l.LineId))
                doc.DocumentLines.Add(new DocumentLine { Description = l.Description, Quantity = l.Quantity, UnitPrice = l.UnitPrice });
        else
            foreach (var (description, amount) in OrderPricing.Lines(order))   // one line per part: Photography / Videography / Album
                doc.DocumentLines.Add(new DocumentLine { Description = description, Quantity = 1, UnitPrice = amount });

        db.Documents.Add(doc);
        await db.SaveChangesAsync(ct);
        return await GetAsync(doc.DocumentId, ct);
    }
}
