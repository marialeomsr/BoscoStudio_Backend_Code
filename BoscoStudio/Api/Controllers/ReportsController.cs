using BoscoStudio.Application.Dtos;
using BoscoStudio.Application.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/reports")]
public class ReportsController(IReportService reports) : ControllerBase
{
    private const string XlsxContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    /// <summary>Report for a date range (inclusive): orders, payments received, expenses and net profit.</summary>
    [HttpGet]
    public Task<DateRangeReportDto> Get([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct) =>
        reports.GetAsync(from, to, ct);

    /// <summary>Same report as a downloadable Excel workbook (Summary, Orders, Payments, Expenses sheets).</summary>
    [HttpGet("export")]
    public async Task<FileContentResult> Export([FromQuery] DateOnly from, [FromQuery] DateOnly to, CancellationToken ct) =>
        File(await reports.ExportExcelAsync(from, to, ct), XlsxContentType, $"BoscoStudio-report-{from:yyyyMMdd}-{to:yyyyMMdd}.xlsx");
}
