using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

/// <summary>Quotations and invoices. Creation is addressed through the order.</summary>
[Authorize]
[ApiController]
[Route("api")]
public class DocumentsController(IDocumentService documents) : ControllerBase
{
    [HttpGet("documents")]
    public Task<List<DocumentSummaryDto>> List([FromQuery] string? type, CancellationToken ct) =>
        documents.GetListAsync(type, ct);

    [HttpGet("documents/{documentId:int}")]
    public Task<DocumentDetailDto> Get(int documentId, CancellationToken ct) => documents.GetAsync(documentId, ct);

    /// <summary>Edit due date, notes and terms of an issued quotation / invoice.</summary>
    [RequirePermission(AppPermissions.DocumentsManage)]
    [HttpPut("documents/{documentId:int}")]
    public Task<DocumentDetailDto> Update(int documentId, UpdateDocumentRequest request, CancellationToken ct) =>
        documents.UpdateAsync(documentId, request, ct);

    [RequirePermission(AppPermissions.DocumentsManage)]
    [HttpPost("orders/{orderId:int}/documents")]
    public async Task<ActionResult<DocumentDetailDto>> Create(int orderId, CreateDocumentRequest request, CancellationToken ct)
    {
        var created = await documents.CreateAsync(orderId, request, ct);
        return CreatedAtAction(nameof(Get), new { documentId = created.DocumentId }, created);
    }
}
