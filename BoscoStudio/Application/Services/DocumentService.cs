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
                d.IssueDate, d.Order.TotalAmount ?? 0,
                (d.Order.TotalAmount ?? 0) - d.Order.Payments.Sum(p => p.Amount)))
            .ToListAsync(ct);

    public async Task<DocumentDetailDto> GetAsync(int documentId, CancellationToken ct)
    {
        var d = await db.Documents.AsNoTracking()
            .Include(x => x.DocumentLines)
            .Include(x => x.Order).ThenInclude(o => o.Client)
            .Include(x => x.Order).ThenInclude(o => o.Payments)
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
            o.TotalPaid, o.BalanceDue);
    }

    public async Task<DocumentDetailDto> UpdateAsync(int documentId, UpdateDocumentRequest r, CancellationToken ct)
    {
        var doc = await db.Documents.FirstOrDefaultAsync(d => d.DocumentId == documentId, ct)
            ?? throw new NotFoundException("Document", documentId);
        // Amounts always come from the order (edit the order to change price, discount or tax); here only the wording.
        doc.DueDate = r.DueDate;
        doc.Notes = string.IsNullOrWhiteSpace(r.Notes) ? null : r.Notes.Trim();
        doc.Terms = string.IsNullOrWhiteSpace(r.Terms) ? null : r.Terms.Trim();
        await db.SaveChangesAsync(ct);
        return await GetAsync(documentId, ct);
    }

    public async Task<DocumentDetailDto> CreateAsync(int orderId, CreateDocumentRequest r, CancellationToken ct)
    {
        var order = await db.Orders.Include(o => o.Package).Include(o => o.Documents)
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
        // The document's total always equals the order total (discount and tax are applied below the line items).
        doc.DocumentLines.Add(new DocumentLine
        {
            Description = order.Package is null ? $"{order.EventType} photography" : $"{order.Package.PackageName} – {order.EventType}",
            Quantity = 1,
            UnitPrice = order.PackageAmount
        });

        db.Documents.Add(doc);
        await db.SaveChangesAsync(ct);
        return await GetAsync(doc.DocumentId, ct);
    }
}
