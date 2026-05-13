using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
        Task<AuthResponseDto> LoginAsync(LoginDto dto);
        Task<UserInfoDto?> GetUserInfoAsync(string userId);
        Task<UserInfoDto> UpdateProfileAsync(string userId, UpdateProfileDto dto);
    }
}
