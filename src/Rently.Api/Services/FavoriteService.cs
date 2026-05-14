using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Api.Services;

public class FavoriteService : IFavoriteService
{
    private readonly ApplicationDbContext _db;
    private readonly IAccommodationService _accommodationService;

    public FavoriteService(ApplicationDbContext db, IAccommodationService accommodationService)
    {
        _db = db;
        _accommodationService = accommodationService;
    }

    public async Task<IReadOnlyList<FavoriteItemDto>> GetFavoritesAsync(string userId)
    {
        var favorites = await _db.Favorites
            .AsNoTracking()
            .Where(favorite => favorite.UserId == userId)
            .ToListAsync();

        var groupedFavorites = favorites
            .GroupBy(favorite => favorite.AccommodationId)
            .ToList();

        var results = new List<FavoriteItemDto>();
        foreach (var group in groupedFavorites)
        {
            var accommodation = await _accommodationService.GetAccommodationByIdAsync(group.Key);
            if (accommodation == null)
            {
                continue;
            }

            var types = group.Select(favorite => favorite.Type).ToList();
            results.Add(new FavoriteItemDto
            {
                Accommodation = accommodation,
                Types = types,
                IsGuestFavorite = types.Contains(FavoriteType.Guest),
                IsHostFavorite = types.Contains(FavoriteType.Host)
            });
        }

        return results;
    }

    public async Task<FavoriteStatusDto> GetFavoriteStatusAsync(string userId, int accommodationId)
    {
        var favorites = await _db.Favorites
            .AsNoTracking()
            .Where(favorite => favorite.UserId == userId && favorite.AccommodationId == accommodationId)
            .Select(favorite => favorite.Type)
            .ToListAsync();

        return new FavoriteStatusDto
        {
            GuestFavorited = favorites.Contains(FavoriteType.Guest),
            HostFavorited = favorites.Contains(FavoriteType.Host)
        };
    }

    public async Task<AddFavoriteResultDto?> AddFavoriteAsync(string userId, int accommodationId, string type)
    {
        var favoriteType = ParseRequiredFavoriteType(type);

        var accommodationExists = await _db.Accommodations
            .AsNoTracking()
            .AnyAsync(accommodation => accommodation.Id == accommodationId);

        if (!accommodationExists)
        {
            throw new ArgumentException("Accommodation not found.");
        }

        var exists = await _db.Favorites.AnyAsync(favorite =>
            favorite.UserId == userId &&
            favorite.AccommodationId == accommodationId &&
            favorite.Type == favoriteType);

        if (exists)
        {
            return null;
        }

        _db.Favorites.Add(new Favorite
        {
            UserId = userId,
            AccommodationId = accommodationId,
            Type = favoriteType
        });

        await _db.SaveChangesAsync();

        return new AddFavoriteResultDto
        {
            Type = favoriteType
        };
    }

    public async Task<bool> RemoveFavoriteAsync(string userId, int accommodationId, string? type)
    {
        var favoriteType = ParseOptionalFavoriteType(type);

        if (favoriteType == null)
        {
            var favorites = await _db.Favorites
                .Where(favorite => favorite.UserId == userId && favorite.AccommodationId == accommodationId)
                .ToListAsync();

            if (favorites.Count == 0)
            {
                return false;
            }

            _db.Favorites.RemoveRange(favorites);
            await _db.SaveChangesAsync();
            return true;
        }

        var favoriteToRemove = await _db.Favorites.FirstOrDefaultAsync(favorite =>
            favorite.UserId == userId &&
            favorite.AccommodationId == accommodationId &&
            favorite.Type == favoriteType.Value);

        if (favoriteToRemove == null)
        {
            return false;
        }

        _db.Favorites.Remove(favoriteToRemove);
        await _db.SaveChangesAsync();
        return true;
    }

    private static FavoriteType ParseRequiredFavoriteType(string type)
    {
        if (Enum.TryParse<FavoriteType>(type, ignoreCase: true, out var parsedType))
        {
            return parsedType;
        }

        throw new InvalidOperationException("Favorite type must be either Guest or Host.");
    }

    private static FavoriteType? ParseOptionalFavoriteType(string? type)
    {
        if (string.IsNullOrWhiteSpace(type))
        {
            return null;
        }

        if (Enum.TryParse<FavoriteType>(type, ignoreCase: true, out var parsedType))
        {
            return parsedType;
        }

        throw new InvalidOperationException("Favorite type must be either Guest or Host.");
    }
}
