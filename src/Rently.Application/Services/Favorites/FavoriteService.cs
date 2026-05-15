using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
using Rently.Application.Interfaces;
using Rently.Application.Mappers;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Favorites;

public class FavoriteService : IFavoriteService
{
    private readonly ApplicationDbContext _db;

    public FavoriteService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<FavoriteItemDto>> GetFavoritesAsync(string userId, CancellationToken cancellationToken = default)
    {
        var favorites = await _db.Favorites
            .AsNoTracking()
            .Where(favorite => favorite.UserId == userId)
            .ToListAsync(cancellationToken);

        var groupedFavorites = favorites
            .GroupBy(favorite => favorite.AccommodationId)
            .ToList();

        var accommodationIds = groupedFavorites
            .Select(group => group.Key)
            .ToList();

        var accommodations = await _db.Accommodations
            .Include(accommodation => accommodation.Address)
            .Include(accommodation => accommodation.AccommodationAmenities!)
                .ThenInclude(accommodationAmenity => accommodationAmenity.Amenity)
            .Include(accommodation => accommodation.Photos)
            .Include(accommodation => accommodation.Reviews)
            .Include(accommodation => accommodation.Bookings)
            .Include(accommodation => accommodation.FavoritedBy)
            .Where(accommodation => accommodationIds.Contains(accommodation.Id))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var hostIds = accommodations
            .Select(accommodation => accommodation.HostId)
            .Distinct()
            .ToList();

        var reviewerIds = accommodations
            .SelectMany(accommodation => accommodation.Reviews?.Select(review => review.GuestId) ?? [])
            .Distinct()
            .ToList();

        var allUserIds = hostIds
            .Concat(reviewerIds)
            .Distinct()
            .ToList();

        var users = await _db.Users
            .Where(user => allUserIds.Contains(user.Id))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var usersById = users.ToDictionary(user => user.Id);

        var availabilityBlocks = await _db.AvailabilityBlocks
            .Where(block => accommodationIds.Contains(block.AccommodationId))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var availabilityBlocksByAccommodationId = availabilityBlocks
            .GroupBy(block => block.AccommodationId)
            .ToDictionary(group => group.Key, group => group.ToList());

        var accommodationsById = accommodations.ToDictionary(accommodation => accommodation.Id);
        var results = new List<FavoriteItemDto>();
        foreach (var group in groupedFavorites)
        {
            if (!accommodationsById.TryGetValue(group.Key, out var accommodation))
            {
                continue;
            }

            var types = group.Select(favorite => favorite.Type).ToList();
            var host = usersById.GetValueOrDefault(accommodation.HostId);
            var reviewers = BuildReviewersDictionary(accommodation, usersById);
            var blocks = availabilityBlocksByAccommodationId.GetValueOrDefault(accommodation.Id);
            var accommodationDto = AccommodationMapper.ToDto(accommodation, host, reviewers, blocks);
            accommodationDto.FavoritesCount = CountGuestFavorites(accommodation);

            results.Add(new FavoriteItemDto
            {
                Accommodation = accommodationDto,
                Types = types,
                IsGuestFavorite = types.Contains(FavoriteType.Guest),
                IsHostFavorite = types.Contains(FavoriteType.Host)
            });
        }

        return results;
    }

    public async Task<FavoriteStatusDto> GetFavoriteStatusAsync(string userId, int accommodationId, CancellationToken cancellationToken = default)
    {
        var favorites = await _db.Favorites
            .AsNoTracking()
            .Where(favorite => favorite.UserId == userId && favorite.AccommodationId == accommodationId)
            .Select(favorite => favorite.Type)
            .ToListAsync(cancellationToken);

        return new FavoriteStatusDto
        {
            GuestFavorited = favorites.Contains(FavoriteType.Guest),
            HostFavorited = favorites.Contains(FavoriteType.Host)
        };
    }

    public async Task<AddFavoriteResultDto?> AddFavoriteAsync(string userId, int accommodationId, string type, CancellationToken cancellationToken = default)
    {
        var favoriteType = ParseRequiredFavoriteType(type);

        var accommodationExists = await _db.Accommodations
            .AsNoTracking()
            .AnyAsync(accommodation => accommodation.Id == accommodationId, cancellationToken);

        if (!accommodationExists)
        {
            throw new NotFoundException("Accommodation not found.");
        }

        var exists = await _db.Favorites.AnyAsync(favorite =>
            favorite.UserId == userId &&
            favorite.AccommodationId == accommodationId &&
            favorite.Type == favoriteType, cancellationToken);

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

        await _db.SaveChangesAsync(cancellationToken);

        return new AddFavoriteResultDto
        {
            Type = favoriteType
        };
    }

    public async Task<bool> RemoveFavoriteAsync(string userId, int accommodationId, string? type, CancellationToken cancellationToken = default)
    {
        var favoriteType = ParseOptionalFavoriteType(type);

        if (favoriteType == null)
        {
            var favorites = await _db.Favorites
                .Where(favorite => favorite.UserId == userId && favorite.AccommodationId == accommodationId)
                .ToListAsync(cancellationToken);

            if (favorites.Count == 0)
            {
                return false;
            }

            _db.Favorites.RemoveRange(favorites);
            await _db.SaveChangesAsync(cancellationToken);
            return true;
        }

        var favoriteToRemove = await _db.Favorites.FirstOrDefaultAsync(favorite =>
            favorite.UserId == userId &&
            favorite.AccommodationId == accommodationId &&
            favorite.Type == favoriteType.Value, cancellationToken);

        if (favoriteToRemove == null)
        {
            return false;
        }

        _db.Favorites.Remove(favoriteToRemove);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static Dictionary<string, ApplicationUser> BuildReviewersDictionary(
        Accommodation accommodation,
        IReadOnlyDictionary<string, ApplicationUser> usersById)
    {
        var reviewerIds = accommodation.Reviews?
            .Select(review => review.GuestId)
            .Distinct()
            .ToList() ?? [];

        var reviewers = new Dictionary<string, ApplicationUser>();
        foreach (var reviewerId in reviewerIds)
        {
            if (usersById.TryGetValue(reviewerId, out var reviewer))
            {
                reviewers[reviewerId] = reviewer;
            }
        }

        return reviewers;
    }

    private static int CountGuestFavorites(Accommodation accommodation)
    {
        return accommodation.FavoritedBy?.Count(favorite => favorite.Type == FavoriteType.Guest) ?? 0;
    }

    private static FavoriteType ParseRequiredFavoriteType(string type)
    {
        if (Enum.TryParse<FavoriteType>(type, ignoreCase: true, out var parsedType))
        {
            return parsedType;
        }

        throw new AppValidationException("Favorite type must be either Guest or Host.");
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

        throw new AppValidationException("Favorite type must be either Guest or Host.");
    }
}
