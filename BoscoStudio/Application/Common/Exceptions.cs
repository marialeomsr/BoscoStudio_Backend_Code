namespace BoscoStudio.Application.Common;

/// <summary>Maps to HTTP 404 in ExceptionHandlingMiddleware.</summary>
public class NotFoundException(string entity, object key)
    : Exception($"{entity} '{key}' was not found.");

/// <summary>A business rule was broken (HTTP 400), e.g. overpaying an order.</summary>
public class BusinessRuleException(string message) : Exception(message);

/// <summary>The request clashes with existing data (HTTP 409), e.g. a double-booked slot.</summary>
public class ConflictException(string message) : Exception(message);
