using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Rently.Api.Mappers;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Api.Services
{
    public class AccommodationService : IAccommodationService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public AccommodationService(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<IEnumerable<AccommodationDto>> GetAllAccommodationsAsync(AccommodationListQueryDto queryDto)
        {
            var filters = queryDto ?? new AccommodationListQueryDto();
            var today = DateTime.UtcNow.Date;
            var accommodationsQuery = BuildAccommodationListQuery(today);
            accommodationsQuery = ApplyListFilters(accommodationsQuery, filters);

            var accommodations = await accommodationsQuery.ToListAsync();
            accommodations = ApplyListSorting(accommodations, filters.SortBy);

            return accommodations.Skip(filters.Skip).Take(filters.Limit).Select(accommodation => AccommodationMapper.ToDto(accommodation));
        }

        public async Task<PagedResultDto<AccommodationDto>> SearchAccommodationsAsync(AccommodationSearchQueryDto queryDto)
        {
            var filters = queryDto ?? new AccommodationSearchQueryDto();
            filters.Limit = Math.Clamp(filters.Limit, 1, 200);
            filters.Skip = Math.Max(0, filters.Skip);

            var effectiveCheckIn = filters.CheckIn?.Date;
            var effectiveCheckOut = filters.CheckOut?.Date;
            if (!effectiveCheckIn.HasValue && !effectiveCheckOut.HasValue)
            {
                effectiveCheckIn = DateTime.UtcNow.Date;
                effectiveCheckOut = effectiveCheckIn.Value.AddDays(1);
            }

            var today = DateTime.UtcNow.Date;
            var accommodationsQuery = BuildAccommodationSearchQuery(today);
            accommodationsQuery = ApplySearchFilters(accommodationsQuery, filters, effectiveCheckIn, effectiveCheckOut);

            var total = await accommodationsQuery.CountAsync();

            try
            {
                var allFilteredItems = await LoadSearchResultsAsync(accommodationsQuery);
                var sortedItems = ApplySearchSorting(allFilteredItems, filters.SortBy);

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
                Console.WriteLine($"[ERROR] SearchAccommodationsAsync failed: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
                throw; 
            }
        }

        public async Task<IReadOnlyList<AccommodationDto>> GetHomepageHighestRatedAsync(int count = 16)
        {
            count = Math.Clamp(count, 1, 50);
            var cacheKey = $"homepage:highest-rated:v2:{count}";
            if (_cache.TryGetValue(cacheKey, out List<AccommodationDto>? cached) && cached != null)
                return cached;

            // Bayesian weighted rating to avoid "5★ with 1 review" dominating.
            // score = (v/(v+m))*R + (m/(v+m))*C + popularityBoost
            const int m = 20; // minimum reviews to be considered "reliable"
            var reviewsTotal = await _context.Reviews.AsNoTracking().CountAsync();
            var C = reviewsTotal == 0
                ? 0.0
                : await _context.Reviews.AsNoTracking().AverageAsync(r => (double)r.Rating);
            var today = DateTime.UtcNow.Date;

            var rows = await _context.Accommodations
                .AsNoTracking()
                .Where(IsVisibleOnDate(today))
                .Select(a => new
                {
                    a.Id,
                    a.HostId,
                    a.PropertyType,
                    a.PricePerNight,
                    a.RoomsCount,
                    a.BedsCount,
                    a.Description,
                    a.Title,
                    a.CreatedAt,
                    a.IsActive,
                    a.VisibleFrom,
                    Country = a.Address != null ? a.Address.Country : "",
                    City = a.Address != null ? a.Address.City : "",
                    Street = a.Address != null ? a.Address.Street : null,
                    ReviewsCount = _context.Reviews.Count(r => r.AccommodationId == a.Id),
                    AvgRating = _context.Reviews
                        .Where(r => r.AccommodationId == a.Id)
                        .Select(r => (double?)r.Rating)
                        .Average() ?? 0.0,
                    Popularity = _context.Bookings.Count(b => b.AccommodationId == a.Id && b.Status == BookingStatus.Confirmed),
                    FirstPhoto = _context.Photos.Where(p => p.AccommodationId == a.Id).Select(p => p.Url).FirstOrDefault()
                })
                .Where(x => x.ReviewsCount > 0)
                .OrderByDescending(x =>
                    ((double)x.ReviewsCount / (x.ReviewsCount + m)) * x.AvgRating +
                    ((double)m / (x.ReviewsCount + m)) * C +
                    ((double)x.Popularity / 1000.0))
                .ThenByDescending(x => x.Popularity)
                .ThenByDescending(x => x.CreatedAt)
                .Take(count)
                .ToListAsync();

            var result = rows.Select(x => new AccommodationDto
            {
                Id = x.Id,
                HostId = x.HostId,
                PropertyType = x.PropertyType.ToString(),
                PricePerNight = x.PricePerNight,
                RoomsCount = x.RoomsCount,
                BedsCount = x.BedsCount,
                Description = x.Description,
                Title = AccommodationMapper.BuildTitle(x.Title, x.Description, "Property"),
                CreatedAt = x.CreatedAt,
                IsActive = x.IsActive,
                VisibleFrom = x.VisibleFrom,
                AverageRating = x.AvgRating,
                ReviewsCount = x.ReviewsCount,
                Country = x.Country,
                City = x.City,
                Street = x.Street,
                Amenities = new List<string>(),
                Photos = x.FirstPhoto != null ? new List<string> { x.FirstPhoto } : new List<string>(),
                TotalEarnings = 0,
                NextAvailableDate = DateTime.UtcNow.Date,
                Reviews = null,
                HostName = null,
                HostAvatarUrl = "/icons/user.svg",
                HostCreatedAt = null
            }).ToList();

            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(5));
            return result;
        }

        public async Task<IReadOnlyList<AccommodationDto>> GetHomepageMostVisitedAsync(int count = 16, int skip = 0)
        {
            count = Math.Clamp(count, 1, 50);
            skip = Math.Max(0, skip);
            var cacheKey = $"homepage:most-visited:v2:{count}:{skip}";
            if (_cache.TryGetValue(cacheKey, out List<AccommodationDto>? cached) && cached != null)
                return cached;

            var today = DateTime.UtcNow.Date;
            var rows = await _context.Accommodations
                .AsNoTracking()
                .Where(IsVisibleOnDate(today))
                .Select(a => new
                {
                    a.Id,
                    a.HostId,
                    a.PropertyType,
                    a.PricePerNight,
                    a.RoomsCount,
                    a.BedsCount,
                    a.Description,
                    a.Title,
                    a.CreatedAt,
                    a.IsActive,
                    a.VisibleFrom,
                    Country = a.Address != null ? a.Address.Country : "",
                    City = a.Address != null ? a.Address.City : "",
                    Street = a.Address != null ? a.Address.Street : null,
                    ReviewsCount = _context.Reviews.Count(r => r.AccommodationId == a.Id),
                    AvgRating = _context.Reviews
                        .Where(r => r.AccommodationId == a.Id)
                        .Select(r => (double?)r.Rating)
                        .Average() ?? 0.0,
                    Popularity = _context.Bookings.Count(b => b.AccommodationId == a.Id && b.Status == BookingStatus.Confirmed),
                    FirstPhoto = _context.Photos.Where(p => p.AccommodationId == a.Id).Select(p => p.Url).FirstOrDefault()
                })
                .OrderByDescending(x => x.Popularity)
                .ThenByDescending(x => x.AvgRating)
                .ThenByDescending(x => x.ReviewsCount)
                .Skip(skip)
                .Take(count)
                .ToListAsync();

            var result = rows.Select(x => new AccommodationDto
            {
                Id = x.Id,
                HostId = x.HostId,
                PropertyType = x.PropertyType.ToString(),
                PricePerNight = x.PricePerNight,
                RoomsCount = x.RoomsCount,
                BedsCount = x.BedsCount,
                Description = x.Description,
                Title = AccommodationMapper.BuildTitle(x.Title, x.Description, "Property"),
                CreatedAt = x.CreatedAt,
                IsActive = x.IsActive,
                VisibleFrom = x.VisibleFrom,
                AverageRating = x.AvgRating,
                ReviewsCount = x.ReviewsCount,
                Country = x.Country,
                City = x.City,
                Street = x.Street,
                Amenities = new List<string>(),
                Photos = x.FirstPhoto != null ? new List<string> { x.FirstPhoto } : new List<string>(),
                TotalEarnings = 0,
                NextAvailableDate = DateTime.UtcNow.Date,
                Reviews = null,
                HostName = null,
                HostAvatarUrl = "/icons/user.svg",
                HostCreatedAt = null
            }).ToList();

            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(5));
            return result;
        }

        public async Task<AccommodationDto?> GetAccommodationByIdAsync(int id)
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
                .FirstOrDefaultAsync(a => a.Id == id);

            if (accommodation == null) return null;

            var host = await _context.Users.FirstOrDefaultAsync(u => u.Id == accommodation.HostId);
            
            var reviewerIds = accommodation.Reviews?.Select(r => r.GuestId).Distinct().ToList() ?? new List<string>();
            var reviewersList = await _context.Users.Where(u => reviewerIds.Contains(u.Id)).ToListAsync();
            var reviewersDict = reviewersList.ToDictionary(u => u.Id);
            var availabilityBlocks = await _context.AvailabilityBlocks
                .AsNoTracking()
                .Where(block => block.AccommodationId == id)
                .ToListAsync();

            var dto = AccommodationMapper.ToDto(accommodation, host, reviewersDict, availabilityBlocks);
            dto.FavoritesCount = CountGuestFavorites(accommodation);
            return dto;
        }

        public async Task<AccommodationDto> CreateAccommodationAsync(string hostId, CreateAccommodationDto dto)
        {
            var accommodation = new Accommodation
            {
                HostId = hostId,
                PropertyType = dto.PropertyType,
                PricePerNight = dto.PricePerNight,
                RoomsCount = dto.RoomsCount,
                BedsCount = dto.BedsCount,
                Description = dto.Description,
                Title = AccommodationMapper.BuildTitle(dto.Title, dto.Description, "Property"),
                IsActive = dto.IsActive,
                VisibleFrom = dto.VisibleFrom?.Date,
                CreatedAt = DateTime.UtcNow,
                Address = new Address
                {
                    Country = dto.Country,
                    City = dto.City,
                    Street = dto.Street,
                    PostalCode = dto.PostalCode,
                    BuildingNumber = dto.BuildingNumber,
                    Latitude = dto.Latitude,
                    Longitude = dto.Longitude
                }
            };

            if (dto.AmenityIds != null && dto.AmenityIds.Any())
            {
                accommodation.AccommodationAmenities = dto.AmenityIds.Select(id => new AccommodationAmenity { AmenityId = id }).ToList();
            }

            if (dto.PhotoUrls != null && dto.PhotoUrls.Any())
            {
                accommodation.Photos = dto.PhotoUrls.Select(url => new Photo { Url = url }).ToList();
            }

            _context.Accommodations.Add(accommodation);
            await _context.SaveChangesAsync();
            ClearHomepageCache();

            return await GetAccommodationByIdAsync(accommodation.Id) ?? AccommodationMapper.ToDto(accommodation);
        }

        public async Task<bool> DeleteAccommodationAsync(int id, string hostId)
        {
            var accommodation = await _context.Accommodations.FirstOrDefaultAsync(a => a.Id == id && a.HostId == hostId);
            if (accommodation == null) return false;

            _context.Accommodations.Remove(accommodation);
            await _context.SaveChangesAsync();
            ClearHomepageCache();
            return true;
        }

        public async Task<IEnumerable<string>> GetUniqueLocationsAsync()
        {
            var today = DateTime.UtcNow.Date;
            return await _context.Accommodations
                .Include(a => a.Address)
                .Where(a => a.Address != null)
                .Where(IsVisibleOnDate(today))
                .Select(a => $"{a.Address!.City}, {a.Address.Country}")
                .Distinct()
                .ToListAsync();
        }

        public async Task<IEnumerable<AccommodationDto>> GetHostAccommodationsAsync(string hostId)
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
                .ToListAsync();

            return accommodations.Select(a =>
            {
                var dto = AccommodationMapper.ToDto(a);
                dto.FavoritesCount = CountGuestFavorites(a);
                return dto;
            });
        }

        public async Task<AccommodationDto?> UpdateAccommodationAsync(int id, string hostId, UpdateAccommodationDto dto)
        {
            var accommodation = await _context.Accommodations
                .Include(a => a.Address)
                .Include(a => a.AccommodationAmenities)
                .Include(a => a.Photos)
                .FirstOrDefaultAsync(a => a.Id == id && a.HostId == hostId);

            if (accommodation == null) return null;

            accommodation.PropertyType = dto.PropertyType;
            accommodation.PricePerNight = dto.PricePerNight;
            accommodation.RoomsCount = dto.RoomsCount;
            accommodation.BedsCount = dto.BedsCount;
            accommodation.Description = dto.Description;
            accommodation.Title = dto.Title;
            
            // If somehow it ends up empty after assignment, provide a fallback
            if (string.IsNullOrWhiteSpace(accommodation.Title))
            {
                accommodation.Title = AccommodationMapper.BuildTitle(null, dto.Description, "Beautiful Property");
            }
            accommodation.IsActive = dto.IsActive;
            accommodation.VisibleFrom = dto.VisibleFrom?.Date;

            if (accommodation.Address != null)
            {
                accommodation.Address.Country = dto.Country;
                accommodation.Address.City = dto.City;
                accommodation.Address.Street = dto.Street;
                accommodation.Address.PostalCode = dto.PostalCode;
                accommodation.Address.BuildingNumber = dto.BuildingNumber;
                if (dto.Latitude.HasValue) accommodation.Address.Latitude = dto.Latitude.Value;
                if (dto.Longitude.HasValue) accommodation.Address.Longitude = dto.Longitude.Value;
            }

            // Update amenities
            if (dto.AmenityIds != null)
            {
                _context.RemoveRange(accommodation.AccommodationAmenities ?? new List<AccommodationAmenity>());
                accommodation.AccommodationAmenities = dto.AmenityIds
                    .Select(aid => new AccommodationAmenity { AccommodationId = id, AmenityId = aid })
                    .ToList();
            }

            // Update photos
            if (dto.PhotoUrls != null)
            {
                _context.RemoveRange(accommodation.Photos ?? new List<Photo>());
                accommodation.Photos = dto.PhotoUrls
                    .Select(url => new Photo { AccommodationId = id, Url = url })
                    .ToList();
            }

            await _context.SaveChangesAsync();

            ClearHomepageCache();

            return await GetAccommodationByIdAsync(id);
        }

        private static int CountGuestFavorites(Accommodation entity)
        {
            return entity.FavoritedBy?.Count(f => f.Type == FavoriteType.Guest) ?? 0;
        }

        private IQueryable<Accommodation> BuildAccommodationListQuery(DateTime today)
        {
            return _context.Accommodations
                .Include(a => a.Address)
                .Include(a => a.AccommodationAmenities!)
                    .ThenInclude(aa => aa.Amenity)
                .Include(a => a.Photos)
                .Include(a => a.Reviews)
                .Include(a => a.Bookings)
                .Where(IsVisibleOnDate(today));
        }

        private IQueryable<Accommodation> BuildAccommodationSearchQuery(DateTime today)
        {
            return _context.Accommodations
                .AsNoTracking()
                .Where(IsVisibleOnDate(today));
        }

        private IQueryable<Accommodation> ApplyListFilters(
            IQueryable<Accommodation> query,
            AccommodationListQueryDto filters)
        {
            query = ApplyLocationFilter(query, filters.Location);
            query = ApplyPropertyTypeFilter(query, filters.Type);
            query = ApplyPriceAndCapacityFilters(query, filters.MinPrice, filters.MaxPrice, filters.Rooms, filters.Beds);
            query = ApplyAmenityIdFilter(query, filters.AmenityId);
            query = ApplyAvailabilityFilter(query, filters.CheckIn, filters.CheckOut);

            return query;
        }

        private IQueryable<Accommodation> ApplySearchFilters(
            IQueryable<Accommodation> query,
            AccommodationSearchQueryDto filters,
            DateTime? checkIn,
            DateTime? checkOut)
        {
            query = ApplyLocationFilter(query, filters.Location);
            query = ApplyPropertyTypesCsvFilter(query, filters.TypesCsv);
            query = ApplyPriceAndCapacityFilters(query, filters.MinPrice, filters.MaxPrice, filters.Rooms, filters.Beds);
            query = ApplyGuestsFilter(query, filters.Guests);
            query = ApplyAmenitiesCsvFilter(query, filters.AmenitiesCsv);
            query = ApplyAvailabilityFilter(query, checkIn, checkOut);

            return query;
        }

        private static List<Accommodation> ApplyListSorting(List<Accommodation> accommodations, string? sortBy)
        {
            return sortBy switch
            {
                "highest_rated" => accommodations.OrderByDescending(a => a.Reviews != null && a.Reviews.Any() ? a.Reviews.Average(r => r.Rating) : 0).ToList(),
                "most_visited" => accommodations.OrderByDescending(a => a.Bookings?.Count ?? 0).ToList(),
                "price_asc" => accommodations.OrderBy(a => a.PricePerNight).ToList(),
                "price_desc" => accommodations.OrderByDescending(a => a.PricePerNight).ToList(),
                _ => accommodations
            };
        }

        private static IEnumerable<Accommodation> ApplySearchSorting(
            IEnumerable<Accommodation> accommodations,
            string? sortBy)
        {
            return sortBy?.ToLower() switch
            {
                "highest_rated" or "top rated" => accommodations.OrderByDescending(a =>
                    a.Reviews != null && a.Reviews.Any() ? a.Reviews.Average(r => (double)r.Rating) : 0.0),
                "most_visited" or "popularity" or "most visited" => accommodations.OrderByDescending(a =>
                    a.Bookings?.Count(b => b.Status == BookingStatus.Confirmed) ?? 0),
                "price_asc" or "price: low to high" or "price_low_high" => accommodations.OrderBy(a => (double)a.PricePerNight),
                "price_desc" or "price: high to low" or "price_high_low" => accommodations.OrderByDescending(a => (double)a.PricePerNight),
                "newest" => accommodations.OrderByDescending(a => a.CreatedAt),
                _ => accommodations.OrderByDescending(a => a.CreatedAt)
            };
        }

        private static IQueryable<Accommodation> ApplyLocationFilter(IQueryable<Accommodation> query, string? location)
        {
            if (string.IsNullOrWhiteSpace(location))
            {
                return query;
            }

            var lowerLoc = location.Trim().ToLower();
            return query.Where(a =>
                a.Address != null &&
                (a.Address.City.ToLower().Contains(lowerLoc) || a.Address.Country.ToLower().Contains(lowerLoc)));
        }

        private static IQueryable<Accommodation> ApplyPropertyTypeFilter(IQueryable<Accommodation> query, string? type)
        {
            if (string.IsNullOrWhiteSpace(type) || !Enum.TryParse<PropertyType>(type, true, out var propertyType))
            {
                return query;
            }

            return query.Where(a => a.PropertyType == propertyType);
        }

        private static IQueryable<Accommodation> ApplyPropertyTypesCsvFilter(IQueryable<Accommodation> query, string? typesCsv)
        {
            if (string.IsNullOrWhiteSpace(typesCsv))
            {
                return query;
            }

            var propertyTypes = typesCsv
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(value => Enum.TryParse<PropertyType>(value.Replace(" ", ""), true, out var parsed) ? (PropertyType?)parsed : null)
                .Where(value => value.HasValue)
                .Select(value => value!.Value)
                .Distinct()
                .ToList();

            return propertyTypes.Count == 0
                ? query
                : query.Where(a => propertyTypes.Contains(a.PropertyType));
        }

        private static IQueryable<Accommodation> ApplyPriceAndCapacityFilters(
            IQueryable<Accommodation> query,
            decimal? minPrice,
            decimal? maxPrice,
            int? rooms,
            int? beds)
        {
            if (minPrice.HasValue)
            {
                query = query.Where(a => a.PricePerNight >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(a => a.PricePerNight <= maxPrice.Value);
            }

            if (rooms.HasValue)
            {
                query = query.Where(a => a.RoomsCount >= rooms.Value);
            }

            if (beds.HasValue)
            {
                query = query.Where(a => a.BedsCount >= beds.Value);
            }

            return query;
        }

        private static IQueryable<Accommodation> ApplyAmenityIdFilter(IQueryable<Accommodation> query, int? amenityId)
        {
            return amenityId.HasValue
                ? query.Where(a => a.AccommodationAmenities!.Any(aa => aa.AmenityId == amenityId.Value))
                : query;
        }

        private static IQueryable<Accommodation> ApplyGuestsFilter(IQueryable<Accommodation> query, int? guests)
        {
            return guests.HasValue && guests.Value > 0
                ? query.Where(a => (a.BedsCount ?? 0) >= guests.Value)
                : query;
        }

        private static IQueryable<Accommodation> ApplyAmenitiesCsvFilter(IQueryable<Accommodation> query, string? amenitiesCsv)
        {
            if (string.IsNullOrWhiteSpace(amenitiesCsv))
            {
                return query;
            }

            var amenityNames = amenitiesCsv
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Select(name => name.ToLower())
                .Distinct()
                .ToList();

            return amenityNames.Count == 0
                ? query
                : query.Where(a =>
                    a.AccommodationAmenities != null &&
                    a.AccommodationAmenities.Any(aa =>
                        aa.Amenity != null && amenityNames.Contains(aa.Amenity.Name.ToLower())));
        }

        private IQueryable<Accommodation> ApplyAvailabilityFilter(
            IQueryable<Accommodation> query,
            DateTime? checkIn,
            DateTime? checkOut)
        {
            if (!checkIn.HasValue || !checkOut.HasValue)
            {
                return query;
            }

            var normalizedCheckIn = checkIn.Value.Date;
            var normalizedCheckOut = checkOut.Value.Date;

            return query.Where(a =>
                (a.Bookings == null || !a.Bookings.Any(b =>
                    b.Status != BookingStatus.Cancelled &&
                    b.CheckInDate < normalizedCheckOut &&
                    b.CheckOutDate > normalizedCheckIn)) &&
                !_context.AvailabilityBlocks.Any(block =>
                    block.AccommodationId == a.Id &&
                    normalizedCheckIn < block.EndDate &&
                    normalizedCheckOut > block.StartDate));
        }

        private static Task<List<Accommodation>> LoadSearchResultsAsync(IQueryable<Accommodation> query)
        {
            return query
                .Include(a => a.Address)
                .Include(a => a.Photos)
                .Include(a => a.Reviews)
                .Include(a => a.AccommodationAmenities!)
                    .ThenInclude(aa => aa.Amenity)
                .ToListAsync();
        }

        private static System.Linq.Expressions.Expression<Func<Accommodation, bool>> IsVisibleOnDate(DateTime date)
        {
            return accommodation =>
                accommodation.IsActive &&
                (!accommodation.VisibleFrom.HasValue || accommodation.VisibleFrom.Value.Date <= date);
        }

        private void ClearHomepageCache()
        {
            _cache.Remove("homepage:highest-rated:v2:16");
            _cache.Remove("homepage:most-visited:v2:16:0");
        }
    }
}
