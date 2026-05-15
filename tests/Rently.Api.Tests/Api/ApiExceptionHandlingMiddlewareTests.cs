using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Rently.Api.Middleware;
using Rently.Application.Exceptions;

namespace Rently.Api.Tests.Api;

public class ApiExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_ConflictException_Returns409WithMessage()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new ApiExceptionHandlingMiddleware(
            _ => throw new ConflictException("Conflict happened."),
            NullLogger<ApiExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status409Conflict, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        var payload = await JsonSerializer.DeserializeAsync<JsonElement>(context.Response.Body);
        Assert.Equal("Conflict happened.", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task InvokeAsync_ForbiddenException_Returns403WithMessage()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new ApiExceptionHandlingMiddleware(
            _ => throw new ForbiddenException("Forbidden."),
            NullLogger<ApiExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        var payload = await JsonSerializer.DeserializeAsync<JsonElement>(context.Response.Body);
        Assert.Equal("Forbidden.", payload.GetProperty("message").GetString());
    }

    [Fact]
    public async Task InvokeAsync_NotFoundException_Returns404WithMessage()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var middleware = new ApiExceptionHandlingMiddleware(
            _ => throw new NotFoundException("Missing."),
            NullLogger<ApiExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        var payload = await JsonSerializer.DeserializeAsync<JsonElement>(context.Response.Body);
        Assert.Equal("Missing.", payload.GetProperty("message").GetString());
    }
}
