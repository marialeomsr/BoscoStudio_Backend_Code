using BoscoStudio.Application.Dtos;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IAuditService
{
    Task<List<LoginAuditDto>> GetLoginHistoryAsync(DateOnly? from, DateOnly? to, string? username, string? eventType, int take, CancellationToken ct);
}

/// <summary>Reads the sign-in history (writing happens in AuthService).</summary>
public class AuditService(PhotoStudioDbContext db) : IAuditService
{
    public async Task<List<LoginAuditDto>> GetLoginHistoryAsync(
        DateOnly? from, DateOnly? to, string? username, string? eventType, int take, CancellationToken ct)
    {
        var query = db.LoginAudits.AsNoTracking().AsQueryable();
        // Times are stored in UTC, so the date filter is on UTC days.
        if (from is not null) query = query.Where(a => a.OccurredAt >= from.Value.ToDateTime(TimeOnly.MinValue));
        if (to is not null) query = query.Where(a => a.OccurredAt < to.Value.AddDays(1).ToDateTime(TimeOnly.MinValue));
        if (!string.IsNullOrWhiteSpace(username)) query = query.Where(a => a.Username.Contains(username));
        if (!string.IsNullOrWhiteSpace(eventType)) query = query.Where(a => a.EventType == eventType);

        return await query
            .OrderByDescending(a => a.OccurredAt).ThenByDescending(a => a.AuditId)
            .Take(Math.Clamp(take, 1, 1000))
            .Select(a => new LoginAuditDto(a.AuditId, a.Username, a.EventType, a.OccurredAt, a.IpAddress, a.UserAgent))
            .ToListAsync(ct);
    }
}
