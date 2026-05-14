using System.Collections.Generic;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IFavoriteService
    {
        Task<IReadOnlyList<FavoriteItemDto>> GetFavoritesAsync(string userId);
        Task<FavoriteStatusDto> GetFavoriteStatusAsync(string userId, int accommodationId);
        Task<AddFavoriteResultDto?> AddFavoriteAsync(string userId, int accommodationId, string type);
        Task<bool> RemoveFavoriteAsync(string userId, int accommodationId, string? type);
    }
}
