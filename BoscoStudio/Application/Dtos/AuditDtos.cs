namespace BoscoStudio.Application.Dtos;

/// <summary>One sign-in event. OccurredAt is UTC.</summary>
public record LoginAuditDto(long AuditId, int? StudioId, string? StudioName, string Username, string EventType, DateTime OccurredAt, string? IpAddress, string? UserAgent);
