using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
using Rently.Application.Interfaces;
using Rently.Application.Mappers;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Accommodations;

public class AccommodationService : IAccommodationService
{
    private const int MaxPageSize = 200;
    private const int MaxHomepageCount = 50;
    private const string HomepageCacheVersionKey = "homepage:version";
    private static readonly TimeSpan HomepageCacheDuration = TimeSpan.FromMinutes(5);

    private const string NotOwnedAccommodationMessage = "Accommodation not found or you are not the owner.";

    private const string ConfirmedReservationsDeletionMessage =
        "This apartment cannot be deleted while it has confirmed reservations.";

    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    public AccommodationService(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<IEnumerable<AccommodationDto>> GetAllAccommodationsAsync(
        AccommodationListQueryDto queryDto,
        CancellationToken cancellationToken = default)
    {
        var filters = queryDto ?? new AccommodationListQueryDto();
        var limit = Math.Clamp(filters.Limit, 1, MaxPageSize);
        var skip = Math.Max(0, filters.Skip);

        var query = AccommodationQueries.BuildVisibleQuery(_context, DateTime.UtcNow.Date);
        query = AccommodationQueryFilters.ApplyListFilters(query, filters, _context);

        var sortOrder = AccommodationSorting.Parse(filters.SortBy, AccommodationSortOrder.Unsorted);
        var sortedQuery = await AccommodationSorting.ApplyAsync(query, sortOrder, cancellationToken);
        var accommodations = await AccommodationQueries.LoadPageAsync(
            _context, sortedQuery, skip, limit, includeBookings: true, cancellationToken);

        return accommodations.Select(accommodation => AccommodationMapper.ToDto(accommodation));
    }

    public async Task<PagedResultDto<AccommodationDto>> SearchAccommodationsAsync(
        AccommodationSearchQueryDto queryDto,
        CancellationToken cancellationToken = default)
    {
        var filters = queryDto ?? new AccommodationSearchQueryDto();
        filters.Limit = Math.Clamp(filters.Limit, 1, MaxPageSize);
        filters.Skip = Math.Max(0, filters.Skip);

        var query = AccommodationQueries.BuildVisibleQuery(_context, DateTime.UtcNow.Date);
        query = AccommodationQueryFilters.ApplySearchFilters(
            query,
            filters,
            filters.CheckIn?.Date,
            filters.CheckOut?.Date,
            _context);

        var total = await query.CountAsync(cancellationToken);

        var sortOrder = AccommodationSorting.Parse(filters.SortBy, AccommodationSortOrder.Newest);
        var sortedQuery = await AccommodationSorting.ApplyAsync(query, sortOrder, cancellationToken);
        var accommodations = await AccommodationQueries.LoadPageAsync(
            _context, sortedQuery, filters.Skip, filters.Limit, includeBookings: false, cancellationToken);

        return new PagedResultDto<AccommodationDto>
        {
            Items = accommodations.Select(AccommodationMapper.ToListDto).ToList(),
            Total = total,
            Limit = filters.Limit,
            Skip = filters.Skip
        };
    }

    public async Task<IReadOnlyList<AmenityDto>> GetAmenitiesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Amenities
            .AsNoTracking()
            .OrderBy(amenity => amenity.Name)
            .Select(amenity => new AmenityDto
            {
                Id = amenity.Id,
                Name = amenity.Name
            })
            .ToListAsync(cancellationToken);
    }

    public Task<IReadOnlyList<AccommodationDto>> GetHomepageHighestRatedAsync(int count = 16, CancellationToken cancellationToken = default)
    {
        count = Math.Clamp(count, 1, MaxHomepageCount);
        return GetCachedHomepageSectionAsync(
            $"highest-rated:{count}",
            today => AccommodationHomepageQueries.GetHighestRatedAsync(_context, today, count, cancellationToken));
    }

    public Task<IReadOnlyList<AccommodationDto>> GetHomepageMostVisitedAsync(int count = 16, int skip = 0, CancellationToken cancellationToken = default)
    {
        count = Math.Clamp(count, 1, MaxHomepageCount);
        skip = Math.Max(0, skip);
        return GetCachedHomepageSectionAsync(
            $"most-visited:{count}:{skip}",
            today => AccommodationHomepageQueries.GetMostVisitedAsync(_context, today, count, skip, cancellationToken));
    }

    public async Task<AccommodationDto> GetAccommodationByIdAsync(int id, CancellationToken cancellationToken = default)
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
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken)
            ?? throw new NotFoundException("Accommodation not found.");

        var host = await _context.Users.FirstOrDefaultAsync(u => u.Id == accommodation.HostId, cancellationToken);
        var reviewerIds = accommodation.Reviews?.Select(r => r.GuestId).Distinct().ToList() ?? [];
        var reviewersList = await _context.Users.Where(u => reviewerIds.Contains(u.Id)).ToListAsync(cancellationToken);
        var reviewersDict = reviewersList.ToDictionary(u => u.Id);
        var availabilityBlocks = await _context.AvailabilityBlocks
            .AsNoTracking()
            .Where(block => block.AccommodationId == id)
            .ToListAsync(cancellationToken);

        return AccommodationMapper.ToDto(accommodation, host, reviewersDict, availabilityBlocks);
    }

    public async Task<AccommodationDto> CreateAccommodationAsync(string hostId, CreateAccommodationDto dto, CancellationToken cancellationToken = default)
    {
        await EnsureValidAmenitiesAsync(dto.AmenityIds, cancellationToken);
        var accommodation = AccommodationWriteModelMapper.Create(hostId, dto);
        _context.Accommodations.Add(accommodation);
        await _context.SaveChangesAsync(cancellationToken);
        await AssignCoverPhotoAsync(accommodation.Id, cancellationToken);
        ClearHomepageCache();

        return await GetAccommodationByIdAsync(accommodation.Id, cancellationToken);
    }

    public async Task DeleteAccommodationAsync(int id, string hostId, CancellationToken cancellationToken = default)
    {
        var accommodation = await _context.Accommodations
            .Include(a => a.Address)
            .FirstOrDefaultAsync(a => a.Id == id && a.HostId == hostId, cancellationToken)
            ?? throw new NotFoundException(NotOwnedAccommodationMessage);

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

        return accommodations.Select(accommodation => AccommodationMapper.ToDto(accommodation));
    }

    public async Task<AccommodationDto> UpdateAccommodationAsync(int id, string hostId, UpdateAccommodationDto dto, CancellationToken cancellationToken = default)
    {
        var accommodation = await _context.Accommodations
            .Include(a => a.Address)
            .Include(a => a.AccommodationAmenities)
            .Include(a => a.Photos)
            .FirstOrDefaultAsync(a => a.Id == id && a.HostId == hostId, cancellationToken)
            ?? throw new NotFoundException(NotOwnedAccommodationMessage);

        await EnsureValidAmenitiesAsync(dto.AmenityIds, cancellationToken);

        if (dto.AmenityIds != null)
        {
            _context.RemoveRange(accommodation.AccommodationAmenities ?? []);
        }

        if (dto.PhotoUrls != null)
        {
            accommodation.CoverPhotoId = null;
            _context.RemoveRange(accommodation.Photos ?? []);
        }

        AccommodationWriteModelMapper.ApplyUpdate(accommodation, dto);

        await _context.SaveChangesAsync(cancellationToken);
        await AssignCoverPhotoAsync(accommodation.Id, cancellationToken);
        ClearHomepageCache();

        return await GetAccommodationByIdAsync(id, cancellationToken);
    }

    private async Task EnsureValidAmenitiesAsync(IReadOnlyCollection<int>? amenityIds, CancellationToken cancellationToken)
    {
        if (amenityIds == null || amenityIds.Count == 0)
        {
            return;
        }

        var distinctAmenityIds = amenityIds
            .Where(amenityId => amenityId > 0)
            .Distinct()
            .ToList();

        if (distinctAmenityIds.Count != amenityIds.Count)
        {
            throw new AppValidationException("Amenity IDs must be unique positive values.");
        }

        var existingAmenityIds = await _context.Amenities
            .Where(amenity => distinctAmenityIds.Contains(amenity.Id))
            .Select(amenity => amenity.Id)
            .ToListAsync(cancellationToken);

        if (existingAmenityIds.Count != distinctAmenityIds.Count)
        {
            throw new AppValidationException("One or more selected amenities no longer exist. Refresh the form and try again.");
        }
    }

    private async Task<IReadOnlyList<AccommodationDto>> GetCachedHomepageSectionAsync(
        string sectionKey,
        Func<DateTime, Task<List<HomepageAccommodationRow>>> loadRows)
    {
        var cacheKey = $"homepage:v{GetHomepageCacheVersion()}:{sectionKey}";
        if (_cache.TryGetValue(cacheKey, out List<AccommodationDto>? cached) && cached != null)
        {
            return cached;
        }

        var rows = await loadRows(DateTime.UtcNow.Date);
        var result = AccommodationHomepageMapper.ToDtos(rows);
        _cache.Set(cacheKey, result, HomepageCacheDuration);
        return result;
    }

    private int GetHomepageCacheVersion()
    {
        return _cache.TryGetValue(HomepageCacheVersionKey, out int version) ? version : 0;
    }

    /// <summary>
    /// Bumps the version that is part of every homepage cache key, so all cached sections
    /// (any count or skip) become stale at once; old entries simply expire.
    /// </summary>
    private void ClearHomepageCache()
    {
        _cache.Set(HomepageCacheVersionKey, GetHomepageCacheVersion() + 1);
    }

    private async Task AssignCoverPhotoAsync(int accommodationId, CancellationToken cancellationToken)
    {
        var accommodation = await _context.Accommodations
            .Include(item => item.Photos)
            .FirstAsync(item => item.Id == accommodationId, cancellationToken);

        var coverPhotoId = accommodation.Photos?
            .OrderBy(photo => photo.SortOrder)
            .ThenBy(photo => photo.Id)
            .Select(photo => (int?)photo.Id)
            .FirstOrDefault();

        if (accommodation.CoverPhotoId == coverPhotoId)
        {
            return;
        }

        accommodation.CoverPhotoId = coverPhotoId;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
