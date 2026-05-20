using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
using Rently.Application.Interfaces;
using Rently.Application.Mappers;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Accommodations;

public class AccommodationService : IAccommodationService
{
    private const string ConfirmedReservationsDeletionMessage =
        "This apartment cannot be deleted while it has confirmed reservations.";

    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AccommodationService> _logger;

    public AccommodationService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<AccommodationService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<IEnumerable<AccommodationDto>> GetAllAccommodationsAsync(
        AccommodationListQueryDto queryDto,
        CancellationToken cancellationToken = default)
    {
        var filters = queryDto ?? new AccommodationListQueryDto();
        var today = DateTime.UtcNow.Date;
        var accommodationsQuery = AccommodationQueries.BuildAccommodationListQuery(_context, today);
        accommodationsQuery = AccommodationQueryFilters.ApplyListFilters(accommodationsQuery, filters, _context);

        var accommodations = await accommodationsQuery.ToListAsync(cancellationToken);
        accommodations = AccommodationSorting.ApplyListSorting(accommodations, filters.SortBy);

        return accommodations
            .Skip(filters.Skip)
            .Take(filters.Limit)
            .Select(accommodation => AccommodationMapper.ToDto(accommodation));
    }

    public async Task<PagedResultDto<AccommodationDto>> SearchAccommodationsAsync(
        AccommodationSearchQueryDto queryDto,
        CancellationToken cancellationToken = default)
    {
        var filters = queryDto ?? new AccommodationSearchQueryDto();
        filters.Limit = Math.Clamp(filters.Limit, 1, 200);
        filters.Skip = Math.Max(0, filters.Skip);

        var effectiveCheckIn = filters.CheckIn?.Date;
        var effectiveCheckOut = filters.CheckOut?.Date;

        var today = DateTime.UtcNow.Date;
        var accommodationsQuery = AccommodationQueries.BuildAccommodationSearchQuery(_context, today);
        accommodationsQuery = AccommodationQueryFilters.ApplySearchFilters(
            accommodationsQuery,
            filters,
            effectiveCheckIn,
            effectiveCheckOut,
            _context);

        var total = await accommodationsQuery.CountAsync(cancellationToken);

        try
        {
            var allFilteredItems = await AccommodationQueries.LoadSearchResultsAsync(accommodationsQuery, cancellationToken);
            var sortedItems = AccommodationSorting.ApplySearchSorting(allFilteredItems, filters.SortBy);

            var items = sortedItems
                .Skip(filters.Skip)
                .Take(filters.Limit)
                .ToList();

            return new PagedResultDto<AccommodationDto>
            {
                Items = items.Select(accommodation => AccommodationMapper.ToListDto(accommodation)).ToList(),
                Total = total,
                Limit = filters.Limit,
                Skip = filters.Skip
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Accommodation search failed.");
            throw;
        }
    }

    public async Task<IReadOnlyList<AccommodationDto>> GetHomepageHighestRatedAsync(int count = 16, CancellationToken cancellationToken = default)
    {
        count = Math.Clamp(count, 1, 50);
        var cacheKey = AccommodationHomepageCache.HighestRatedKey(count);
        if (_cache.TryGetValue(cacheKey, out List<AccommodationDto>? cached) && cached != null)
        {
            return cached;
        }

        var today = DateTime.UtcNow.Date;
        var rows = await AccommodationHomepageQueries.GetHighestRatedAsync(_context, today, count, cancellationToken);
        var result = AccommodationHomepageMapper.ToDtos(rows);

        _cache.Set(cacheKey, result, AccommodationHomepageCache.CacheDuration);
        return result;
    }

    public async Task<IReadOnlyList<AccommodationDto>> GetHomepageMostVisitedAsync(int count = 16, int skip = 0, CancellationToken cancellationToken = default)
    {
        count = Math.Clamp(count, 1, 50);
        skip = Math.Max(0, skip);
        var cacheKey = AccommodationHomepageCache.MostVisitedKey(count, skip);
        if (_cache.TryGetValue(cacheKey, out List<AccommodationDto>? cached) && cached != null)
        {
            return cached;
        }

        var today = DateTime.UtcNow.Date;
        var rows = await AccommodationHomepageQueries.GetMostVisitedAsync(_context, today, count, skip, cancellationToken);
        var result = AccommodationHomepageMapper.ToDtos(rows);

        _cache.Set(cacheKey, result, AccommodationHomepageCache.CacheDuration);
        return result;
    }

    public async Task<AccommodationDto?> GetAccommodationByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var accommodation = await _context.Accommodations
            .Include(a => a.Address)
            .Include(a => a.AccommodationAmenities!)
                .ThenInclude(aa => aa.Amenity)
            .Include(a => a.Photos)
            .Include(a => a.Reviews)
            .Include(a => a.Bookings)
            .Include(a => a.FavoritedBy)
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (accommodation == null)
        {
            return null;
        }

        var host = await _context.Users.FirstOrDefaultAsync(u => u.Id == accommodation.HostId, cancellationToken);
        var reviewerIds = accommodation.Reviews?.Select(r => r.GuestId).Distinct().ToList() ?? [];
        var reviewersList = await _context.Users.Where(u => reviewerIds.Contains(u.Id)).ToListAsync(cancellationToken);
        var reviewersDict = reviewersList.ToDictionary(u => u.Id);
        var availabilityBlocks = await _context.AvailabilityBlocks
            .AsNoTracking()
            .Where(block => block.AccommodationId == id)
            .ToListAsync(cancellationToken);

        var dto = AccommodationMapper.ToDto(accommodation, host, reviewersDict, availabilityBlocks);
        dto.FavoritesCount = CountGuestFavorites(accommodation);
        return dto;
    }

    public async Task<AccommodationDto> CreateAccommodationAsync(string hostId, CreateAccommodationDto dto, CancellationToken cancellationToken = default)
    {
        var accommodation = AccommodationWriteModelMapper.Create(hostId, dto);
        _context.Accommodations.Add(accommodation);
        await _context.SaveChangesAsync(cancellationToken);
        ClearHomepageCache();

        return await GetAccommodationByIdAsync(accommodation.Id, cancellationToken) ?? AccommodationMapper.ToDto(accommodation);
    }

    public async Task<bool> DeleteAccommodationAsync(int id, string hostId, CancellationToken cancellationToken = default)
    {
        var accommodation = await _context.Accommodations
            .Include(a => a.Address)
            .FirstOrDefaultAsync(a => a.Id == id && a.HostId == hostId, cancellationToken);

        if (accommodation == null)
        {
            return false;
        }

        var hasConfirmedReservations = await _context.Bookings
            .AnyAsync(
                booking => booking.AccommodationId == id && booking.Status == BookingStatus.Confirmed,
                cancellationToken);

        if (hasConfirmedReservations)
        {
            throw new ConflictException(ConfirmedReservationsDeletionMessage);
        }

        var addressId = accommodation.AddressId;

        _context.Accommodations.Remove(accommodation);
        await _context.SaveChangesAsync(cancellationToken);

        var hasOtherAccommodationsAtAddress = await _context.Accommodations
            .AnyAsync(a => a.AddressId == addressId, cancellationToken);

        if (!hasOtherAccommodationsAtAddress && accommodation.Address != null)
        {
            _context.Addresses.Remove(accommodation.Address);
            await _context.SaveChangesAsync(cancellationToken);
        }

        ClearHomepageCache();
        return true;
    }

    public async Task<IEnumerable<string>> GetUniqueLocationsAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        return await _context.Accommodations
            .Include(a => a.Address)
            .Where(a => a.Address != null)
            .Where(AccommodationQueries.IsVisibleOnDate(today))
            .Select(a => $"{a.Address!.City}, {a.Address.Country}")
            .Distinct()
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<AccommodationDto>> GetHostAccommodationsAsync(string hostId, CancellationToken cancellationToken = default)
    {
        var accommodations = await _context.Accommodations
            .Include(a => a.Address)
            .Include(a => a.AccommodationAmenities!)
                .ThenInclude(aa => aa.Amenity)
            .Include(a => a.Photos)
            .Include(a => a.Reviews)
            .Include(a => a.Bookings)
            .Include(a => a.FavoritedBy)
            .Where(a => a.HostId == hostId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return accommodations.Select(accommodation =>
        {
            var dto = AccommodationMapper.ToDto(accommodation);
            dto.FavoritesCount = CountGuestFavorites(accommodation);
            return dto;
        });
    }

    public async Task<AccommodationDto?> UpdateAccommodationAsync(int id, string hostId, UpdateAccommodationDto dto, CancellationToken cancellationToken = default)
    {
        var accommodation = await _context.Accommodations
            .Include(a => a.Address)
            .Include(a => a.AccommodationAmenities)
            .Include(a => a.Photos)
            .FirstOrDefaultAsync(a => a.Id == id && a.HostId == hostId, cancellationToken);

        if (accommodation == null)
        {
            return null;
        }

        if (dto.AmenityIds != null)
        {
            _context.RemoveRange(accommodation.AccommodationAmenities ?? []);
        }

        if (dto.PhotoUrls != null)
        {
            _context.RemoveRange(accommodation.Photos ?? []);
        }

        AccommodationWriteModelMapper.ApplyUpdate(accommodation, dto);

        await _context.SaveChangesAsync(cancellationToken);
        ClearHomepageCache();

        return await GetAccommodationByIdAsync(id, cancellationToken);
    }

    private static int CountGuestFavorites(Accommodation entity)
    {
        return entity.FavoritedBy?.Count(favorite => favorite.Type == FavoriteType.Guest) ?? 0;
    }

    private void ClearHomepageCache()
    {
        _cache.Remove(AccommodationHomepageCache.HighestRatedKey(16));
        _cache.Remove(AccommodationHomepageCache.MostVisitedKey(16, 0));
    }
}
