namespace Rently.Api.Abstractions;

public interface ICurrentUserService
{
    string? UserId { get; }
    string GetRequiredUserId();
}
