using System.Text;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IAuditService
{
    Task<List<LoginAuditDto>> GetLoginHistoryAsync(DateOnly? from, DateOnly? to, int? studioId, string? username, string? eventType, int take, CancellationToken ct);
    /// <summary>The same report as a CSV file (UTF-8 with BOM so Excel opens it correctly).</summary>
    Task<byte[]> ExportLoginHistoryAsync(DateOnly? from, DateOnly? to, int? studioId, string? username, string? eventType, CancellationToken ct);
}

/// <summary>Reads the sign-in history across all studios (writing happens in AuthService). The caller must be the SuperAdmin.</summary>
public class AuditService(PhotoStudioDbContext db) : IAuditService
{
    private const int ExportLimit = 100_000;

    public Task<List<LoginAuditDto>> GetLoginHistoryAsync(
        DateOnly? from, DateOnly? to, int? studioId, string? username, string? eventType, int take, CancellationToken ct) =>
        Query(from, to, studioId, username, eventType).Take(Math.Clamp(take, 1, 1000)).ToListAsync(ct);

    public async Task<byte[]> ExportLoginHistoryAsync(
        DateOnly? from, DateOnly? to, int? studioId, string? username, string? eventType, CancellationToken ct)
    {
        var rows = await Query(from, to, studioId, username, eventType).Take(ExportLimit).ToListAsync(ct);
        var sb = new StringBuilder("Studio,Username,Event,Date and time (UTC),IP address,Browser / device\r\n");
        foreach (var r in rows)
            sb.AppendJoin(',', Csv(r.StudioName ?? ""), Csv(r.Username), Csv(r.EventType), Csv(r.OccurredAt.ToString("yyyy-MM-dd HH:mm:ss")), Csv(r.IpAddress ?? ""), Csv(r.UserAgent ?? "")).Append("\r\n");
        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();
    }

    /// <summary>Quotes a field and neutralises spreadsheet formulas (a username like =HYPERLINK(...) must not run in Excel).</summary>
    private static string Csv(string value)
    {
        if (value.Length > 0 && "=+-@\t\r".Contains(value[0])) value = "'" + value;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }

    private IQueryable<LoginAuditDto> Query(DateOnly? from, DateOnly? to, int? studioId, string? username, string? eventType)
    {
        var query = db.LoginAudits.AsNoTracking().AsQueryable();
        // Times are stored in UTC, so the date filter is on UTC days.
        if (from is not null) query = query.Where(a => a.OccurredAt >= from.Value.ToDateTime(TimeOnly.MinValue));
        if (to is not null) query = query.Where(a => a.OccurredAt < to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue));
        if (studioId is not null) query = query.Where(a => a.StudioId == studioId);
        if (!string.IsNullOrWhiteSpace(username)) query = query.Where(a => a.Username.Contains(username));
        if (!string.IsNullOrWhiteSpace(eventType)) query = query.Where(a => a.EventType == eventType);

        return query
            .OrderByDescending(a => a.OccurredAt).ThenByDescending(a => a.AuditId)
            .Select(a => new LoginAuditDto(
                a.AuditId, a.StudioId, db.Studios.Where(s => s.StudioId == a.StudioId).Select(s => s.StudioName).FirstOrDefault(),
                a.Username, a.EventType, a.OccurredAt, a.IpAddress, a.UserAgent));
    }
}
