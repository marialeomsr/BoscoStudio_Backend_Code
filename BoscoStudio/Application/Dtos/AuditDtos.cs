namespace BoscoStudio.Application.Dtos;

/// <summary>One sign-in event. OccurredAt is UTC.</summary>
public record LoginAuditDto(long AuditId, string Username, string EventType, DateTime OccurredAt, string? IpAddress, string? UserAgent);
