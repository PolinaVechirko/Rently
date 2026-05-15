using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IFavoriteService
    {
        Task<IReadOnlyList<FavoriteItemDto>> GetFavoritesAsync(string userId, CancellationToken cancellationToken = default);
        Task<FavoriteStatusDto> GetFavoriteStatusAsync(string userId, int accommodationId, CancellationToken cancellationToken = default);
        Task<AddFavoriteResultDto?> AddFavoriteAsync(string userId, int accommodationId, string type, CancellationToken cancellationToken = default);
        Task<bool> RemoveFavoriteAsync(string userId, int accommodationId, string? type, CancellationToken cancellationToken = default);
    }
}
