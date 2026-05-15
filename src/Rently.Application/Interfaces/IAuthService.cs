using System.Threading;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
        Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
        Task<UserInfoDto?> GetUserInfoAsync(string userId, CancellationToken cancellationToken = default);
        Task<UserInfoDto> UpdateProfileAsync(string userId, UpdateProfileDto dto, CancellationToken cancellationToken = default);
    }
}
