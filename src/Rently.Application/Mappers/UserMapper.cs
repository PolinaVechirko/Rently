using Rently.Application.DTOs;
using Rently.Persistence;

namespace Rently.Application.Mappers;

public static class UserMapper
{
    public const string DefaultAvatarUrl = "/icons/user.svg";

    public static UserInfoDto ToUserInfoDto(ApplicationUser user)
    {
        return new UserInfoDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Bio = user.Bio,
            Role = user.Role.ToString(),
            PhoneNumber = user.PhoneNumber,
            ProfilePhotoUrl = user.ProfilePhotoUrl ?? DefaultAvatarUrl
        };
    }
}
