using BoscoStudio.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace BoscoStudio.Api.Middleware;

/// <summary>Turns exceptions into RFC 7807 problem responses so controllers stay free of try/catch.</summary>
public class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex) when (!context.Response.HasStarted)
        {
            var (status, title) = ex switch
            {
                NotFoundException => (StatusCodes.Status404NotFound, "Not found"),
                BusinessRuleException => (StatusCodes.Status400BadRequest, "Business rule violated"),
                ConflictException => (StatusCodes.Status409Conflict, "Conflict"),
                OperationCanceledException => (499, "Request cancelled"),
                _ => (StatusCodes.Status500InternalServerError, "Unexpected server error")
            };

            if (status == StatusCodes.Status500InternalServerError)
                logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);

            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = status,
                Title = title,
                // Never leak internals for 500s.
                Detail = status == StatusCodes.Status500InternalServerError ? "Something went wrong. Check the server log." : ex.Message
            });
        }
    }
}
