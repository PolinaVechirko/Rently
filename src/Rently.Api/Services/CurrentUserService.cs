using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Rently.Api.Abstractions;
using Rently.Application.Exceptions;

namespace Rently.Api.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? UserId =>
        _httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);

    public string GetRequiredUserId()
    {
        return UserId ?? throw new AuthenticationException("Authentication is required.");
    }
}
