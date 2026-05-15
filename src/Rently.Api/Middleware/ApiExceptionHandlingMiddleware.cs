using System.Text.Json;
using Rently.Application.Exceptions;

namespace Rently.Api.Middleware;

public class ApiExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private readonly RequestDelegate _next;
    private readonly ILogger<ApiExceptionHandlingMiddleware> _logger;

    public ApiExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ApiExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ArgumentException exception)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status400BadRequest,
                exception.Message);
        }
        catch (AppValidationException exception)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status400BadRequest,
                exception.Message);
        }
        catch (ConflictException exception)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status409Conflict,
                exception.Message);
        }
        catch (KeyNotFoundException exception)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status404NotFound,
                exception.Message);
        }
        catch (NotFoundException exception)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status404NotFound,
                exception.Message);
        }
        catch (InvalidOperationException exception)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status400BadRequest,
                exception.Message);
        }
        catch (ForbiddenException exception)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status403Forbidden,
                exception.Message);
        }
        catch (AuthenticationException exception)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status401Unauthorized,
                exception.Message);
        }
        catch (UnauthorizedAccessException exception)
        {
            await WriteErrorAsync(
                context,
                StatusCodes.Status401Unauthorized,
                exception.Message);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unhandled exception while processing request.");
            await WriteErrorAsync(
                context,
                StatusCodes.Status500InternalServerError,
                "An unexpected server error occurred.");
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, int statusCode, string message)
    {
        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = JsonSerializer.Serialize(new { message }, SerializerOptions);
        await context.Response.WriteAsync(payload);
    }
}
