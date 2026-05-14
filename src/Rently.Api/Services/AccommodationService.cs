using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;
using ApplicationUser = Rently.Persistence.ApplicationUser;

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
            var accommodationsQuery = _context.Accommodations
                .Include(a => a.Address)
                .Include(a => a.AccommodationAmenities!)
                    .ThenInclude(aa => aa.Amenity)
                .Include(a => a.Photos)
                .Include(a => a.Reviews)
                .Include(a => a.Bookings)
                .Where(IsVisibleOnDate(today))
                .AsQueryable();

            // Filters
            if (!string.IsNullOrEmpty(filters.Location))
            {
                var lowerLoc = filters.Location.ToLower();
                accommodationsQuery = accommodationsQuery.Where(a => a.Address != null && (a.Address.City.ToLower().Contains(lowerLoc) || a.Address.Country.ToLower().Contains(lowerLoc)));
            }

            if (!string.IsNullOrEmpty(filters.Type) && Enum.TryParse<PropertyType>(filters.Type, true, out var pType))
            {
                accommodationsQuery = accommodationsQuery.Where(a => a.PropertyType == pType);
            }

            if (filters.MinPrice.HasValue) accommodationsQuery = accommodationsQuery.Where(a => a.PricePerNight >= filters.MinPrice.Value);
            if (filters.MaxPrice.HasValue) accommodationsQuery = accommodationsQuery.Where(a => a.PricePerNight <= filters.MaxPrice.Value);
            if (filters.Rooms.HasValue) accommodationsQuery = accommodationsQuery.Where(a => a.RoomsCount >= filters.Rooms.Value);
            if (filters.Beds.HasValue) accommodationsQuery = accommodationsQuery.Where(a => a.BedsCount >= filters.Beds.Value);

            if (filters.AmenityId.HasValue)
            {
                accommodationsQuery = accommodationsQuery.Where(a => a.AccommodationAmenities!.Any(aa => aa.AmenityId == filters.AmenityId.Value));
            }

            if (filters.CheckIn.HasValue && filters.CheckOut.HasValue)
            {
                var normalizedCheckIn = filters.CheckIn.Value.Date;
                var normalizedCheckOut = filters.CheckOut.Value.Date;

                accommodationsQuery = accommodationsQuery.Where(a =>
                    !a.Bookings!.Any(b =>
                        b.Status != BookingStatus.Cancelled &&
                        b.CheckInDate < normalizedCheckOut &&
                        b.CheckOutDate > normalizedCheckIn) &&
                    !_context.AvailabilityBlocks.Any(block =>
                        block.AccommodationId == a.Id &&
                        normalizedCheckIn < block.EndDate &&
                        normalizedCheckOut > block.StartDate));
            }

            var accommodations = await accommodationsQuery.ToListAsync();

            // Sorting
            if (filters.SortBy == "highest_rated")
            {
                accommodations = accommodations.OrderByDescending(a => a.Reviews != null && a.Reviews.Any() ? a.Reviews.Average(r => r.Rating) : 0).ToList();
            }
            else if (filters.SortBy == "most_visited")
            {
                accommodations = accommodations.OrderByDescending(a => a.Bookings?.Count ?? 0).ToList();
            }
            else if (filters.SortBy == "price_asc")
            {
                accommodations = accommodations.OrderBy(a => a.PricePerNight).ToList();
            }
            else if (filters.SortBy == "price_desc")
            {
                accommodations = accommodations.OrderByDescending(a => a.PricePerNight).ToList();
            }

            return accommodations.Skip(filters.Skip).Take(filters.Limit).Select(a => MapToDto(a));
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
            var accommodationsQuery = _context.Accommodations
                .AsNoTracking()
                .Where(IsVisibleOnDate(today))
                .AsQueryable();

            // Location filter (city/country)
            if (!string.IsNullOrWhiteSpace(filters.Location))
            {
                var lowerLoc = filters.Location.Trim().ToLower();
                accommodationsQuery = accommodationsQuery.Where(a => a.Address != null &&
                                         (a.Address.City.ToLower().Contains(lowerLoc) ||
                                          a.Address.Country.ToLower().Contains(lowerLoc)));
            }

            // Property types filter (CSV, matches enum names)
            if (!string.IsNullOrWhiteSpace(filters.TypesCsv))
            {
                var types = filters.TypesCsv
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(t => Enum.TryParse<PropertyType>(t.Replace(" ", ""), true, out var parsed) ? (PropertyType?)parsed : null)
                    .Where(t => t.HasValue)
                    .Select(t => t!.Value)
                    .Distinct()
                    .ToList();

                if (types.Count > 0)
                {
                    accommodationsQuery = accommodationsQuery.Where(a => types.Contains(a.PropertyType));
                }
            }

            if (filters.MinPrice.HasValue) accommodationsQuery = accommodationsQuery.Where(a => a.PricePerNight >= filters.MinPrice.Value);
            if (filters.MaxPrice.HasValue) accommodationsQuery = accommodationsQuery.Where(a => a.PricePerNight <= filters.MaxPrice.Value);
            if (filters.Rooms.HasValue) accommodationsQuery = accommodationsQuery.Where(a => a.RoomsCount >= filters.Rooms.Value);
            if (filters.Beds.HasValue) accommodationsQuery = accommodationsQuery.Where(a => a.BedsCount >= filters.Beds.Value);

            // Guests: we don't have explicit capacity field; approximate by beds >= guests
            if (filters.Guests.HasValue && filters.Guests.Value > 0)
            {
                accommodationsQuery = accommodationsQuery.Where(a => (a.BedsCount ?? 0) >= filters.Guests.Value);
            }

            // Amenities filter by names (any match)
            if (!string.IsNullOrWhiteSpace(filters.AmenitiesCsv))
            {
                var amenityNames = filters.AmenitiesCsv
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Where(n => !string.IsNullOrWhiteSpace(n))
                    .Select(n => n.ToLower())
                    .Distinct()
                    .ToList();

                if (amenityNames.Count > 0)
                {
                    accommodationsQuery = accommodationsQuery.Where(a => a.AccommodationAmenities != null &&
                                             a.AccommodationAmenities.Any(aa => aa.Amenity != null && amenityNames.Contains(aa.Amenity.Name.ToLower())));
                }
            }

            // Availability
            if (effectiveCheckIn.HasValue && effectiveCheckOut.HasValue)
            {
                var normalizedCheckIn = effectiveCheckIn.Value;
                var normalizedCheckOut = effectiveCheckOut.Value;

                accommodationsQuery = accommodationsQuery.Where(a =>
                    (a.Bookings == null || !a.Bookings.Any(b =>
                        b.Status != BookingStatus.Cancelled &&
                        b.CheckInDate < normalizedCheckOut &&
                        b.CheckOutDate > normalizedCheckIn)) &&
                    !_context.AvailabilityBlocks.Any(block =>
                        block.AccommodationId == a.Id &&
                        normalizedCheckIn < block.EndDate &&
                        normalizedCheckOut > block.StartDate));
            }

            var total = await accommodationsQuery.CountAsync();

            try
            {
                // Fetch filtered items with Includes (in-memory for robust sorting)
                var allFilteredItems = await accommodationsQuery
                    .Include(a => a.Address)
                    .Include(a => a.Photos)
                    .Include(a => a.Reviews)
                    .Include(a => a.AccommodationAmenities!)
                        .ThenInclude(aa => aa.Amenity)
                    .ToListAsync();

                // Sort in-memory to avoid SQLite translation issues
                IEnumerable<Accommodation> sortedItems = filters.SortBy?.ToLower() switch
                {
                    "highest_rated" or "top rated" => allFilteredItems
                        .OrderByDescending(a => a.Reviews != null && a.Reviews.Any()
                            ? a.Reviews.Average(r => (double)r.Rating)
                            : 0.0),
                    "most_visited" or "popularity" or "most visited" => allFilteredItems
                        .OrderByDescending(a => a.Bookings?.Count(b => b.Status == BookingStatus.Confirmed) ?? 0),
                    "price_asc" or "price: low to high" or "price_low_high" => allFilteredItems.OrderBy(a => (double)a.PricePerNight),
                    "price_desc" or "price: high to low" or "price_high_low" => allFilteredItems.OrderByDescending(a => (double)a.PricePerNight),
                    "newest" => allFilteredItems.OrderByDescending(a => a.CreatedAt),
                    _ => allFilteredItems.OrderByDescending(a => a.CreatedAt)
                };

                var items = sortedItems
                    .Skip(filters.Skip)
                    .Take(filters.Limit)
                    .ToList();

                return new PagedResultDto<AccommodationDto>
                {
                    Items = items.Select(MapToListDto).ToList(),
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
                Title = BuildAccommodationTitle(x.Title, x.Description, "Property"),
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
                Title = BuildAccommodationTitle(x.Title, x.Description, "Property"),
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

            var dto = MapToDto(accommodation, host, reviewersDict, availabilityBlocks);
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
                Title = BuildAccommodationTitle(dto.Title, dto.Description, "Property"),
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

            return await GetAccommodationByIdAsync(accommodation.Id) ?? MapToDto(accommodation, null, null);
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
                var dto = MapToDto(a);
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
                accommodation.Title = BuildAccommodationTitle(null, dto.Description, "Beautiful Property");
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

        private AccommodationDto MapToDto(
            Accommodation entity,
            ApplicationUser? host = null,
            Dictionary<string, ApplicationUser>? reviewers = null,
            List<AvailabilityBlock>? availabilityBlocks = null)
        {
            var confirmedBookings = entity.Bookings?.Where(b => b.Status == BookingStatus.Confirmed).ToList() ?? new List<Booking>();
            var unavailableDateRanges = confirmedBookings
                .Where(b => b.CheckOutDate.Date > DateTime.UtcNow.Date)
                .Select(b => new UnavailableDateRangeDto
                {
                    StartDate = b.CheckInDate.Date,
                    EndDate = b.CheckOutDate.Date
                })
                .ToList();

            if (availabilityBlocks != null && availabilityBlocks.Count > 0)
            {
                unavailableDateRanges.AddRange(
                    availabilityBlocks
                        .Where(block => block.EndDate.Date > DateTime.UtcNow.Date)
                        .Select(block => new UnavailableDateRangeDto
                        {
                            StartDate = block.StartDate.Date,
                            EndDate = block.EndDate.Date
                        }));
            }
            
            // Calculate Total Earnings (Confirmed past bookings)
            decimal totalEarnings = 0;
            foreach (var b in confirmedBookings)
            {
                if (b.CheckInDate < DateTime.UtcNow)
                {
                    var days = (decimal)(b.CheckOutDate - b.CheckInDate).TotalDays;
                    totalEarnings += days * entity.PricePerNight;
                }
            }

            // Calculate Next Available Date
            DateTime nextAvailable = DateTime.UtcNow.Date;
            var futureBookings = confirmedBookings.Where(b => b.CheckOutDate > DateTime.UtcNow).OrderBy(b => b.CheckInDate).ToList();
            foreach (var b in futureBookings)
            {
                if (b.CheckInDate <= nextAvailable)
                {
                    nextAvailable = b.CheckOutDate.Date;
                }
                else
                {
                    break;
                }
            }

            var reviews = entity.Reviews?.Select(r => new ReviewDto
            {
                Id = r.Id,
                Comment = r.Comment,
                HostReply = r.HostReply,
                HostReplyCreatedAt = r.HostReplyCreatedAt,
                Rating = r.Rating,
                CreatedAt = r.CreatedAt,
                ReviewerName = (reviewers != null && reviewers.TryGetValue(r.GuestId, out var g)) ? g.FullName : "Anonymous",
                ReviewerAvatarUrl = (reviewers != null && reviewers.TryGetValue(r.GuestId, out var g2)) ? g2.ProfilePhotoUrl ?? "/icons/user.svg" : "/icons/user.svg"
            }).ToList();

            return new AccommodationDto
            {
                Id = entity.Id,
                HostId = entity.HostId,
                PropertyType = entity.PropertyType.ToString(),
                PricePerNight = entity.PricePerNight,
                RoomsCount = entity.RoomsCount,
                BedsCount = entity.BedsCount,
                Description = entity.Description,
                Title = BuildAccommodationTitle(entity.Title, entity.Description, entity.PropertyType.ToString()),
                CreatedAt = entity.CreatedAt,
                IsActive = entity.IsActive,
                VisibleFrom = entity.VisibleFrom?.Date,
                AverageRating = (entity.Reviews != null && entity.Reviews.Any()) ? entity.Reviews.Average(r => r.Rating) : 0,
                ReviewsCount = entity.Reviews?.Count ?? 0,
                FavoritesCount = entity.FavoritedBy?.Count ?? 0,
                Country = entity.Address?.Country ?? "",
                City = entity.Address?.City ?? "",
                Street = entity.Address?.Street,
                Amenities = entity.AccommodationAmenities?
                    .Where(aa => aa.Amenity != null && !string.IsNullOrEmpty(aa.Amenity.Name))
                    .Select(aa => aa.Amenity!.Name)
                    .ToList() ?? new List<string>(),
                Photos = entity.Photos?.Select(p => p.Url).ToList() ?? new List<string>(),
                IsRented = confirmedBookings.Any(b =>
                    b.CheckInDate <= DateTime.UtcNow &&
                    b.CheckOutDate >= DateTime.UtcNow),
                TotalEarnings = totalEarnings,
                NextAvailableDate = nextAvailable,
                UnavailableDateRanges = unavailableDateRanges,
                Reviews = reviews,
                HostName = host?.FullName,
                HostAvatarUrl = host?.ProfilePhotoUrl ?? "/icons/user.svg",
                HostCreatedAt = host?.CreatedAt,
                HostEmail = host?.Email
            };
        }

        private AccommodationDto MapToListDto(Accommodation entity)
        {
            return new AccommodationDto
            {
                Id = entity.Id,
                HostId = entity.HostId,
                PropertyType = entity.PropertyType.ToString(),
                PricePerNight = entity.PricePerNight,
                RoomsCount = entity.RoomsCount,
                BedsCount = entity.BedsCount,
                Description = entity.Description,
                Title = BuildAccommodationTitle(entity.Title, entity.Description, entity.PropertyType.ToString()),
                CreatedAt = entity.CreatedAt,
                IsActive = entity.IsActive,
                VisibleFrom = entity.VisibleFrom?.Date,
                AverageRating = (entity.Reviews != null && entity.Reviews.Any()) ? entity.Reviews.Average(r => r.Rating) : 0,
                ReviewsCount = entity.Reviews?.Count ?? 0,
                FavoritesCount = entity.FavoritedBy?.Count ?? 0,
                Country = entity.Address?.Country ?? "",
                City = entity.Address?.City ?? "",
                Street = entity.Address?.Street,
                Amenities = entity.AccommodationAmenities?
                    .Where(aa => aa.Amenity != null)
                    .Select(aa => aa.Amenity!.Name)
                    .ToList() ?? new List<string>(),
                Photos = entity.Photos?.Select(p => p.Url).ToList() ?? new List<string>(),
                IsRented = false,
                TotalEarnings = 0,
                NextAvailableDate = DateTime.UtcNow.Date,
                Reviews = null,
                HostName = null,
                HostAvatarUrl = "./icons/user.svg",
                HostCreatedAt = null,
                HostEmail = null
            };
        }

        private static int CountGuestFavorites(Accommodation entity)
        {
            return entity.FavoritedBy?.Count(f => f.Type == FavoriteType.Guest) ?? 0;
        }

        private static string BuildAccommodationTitle(string? explicitTitle, string? description, string fallbackTitle)
        {
            if (!string.IsNullOrWhiteSpace(explicitTitle))
            {
                return explicitTitle;
            }

            if (string.IsNullOrWhiteSpace(description))
            {
                return fallbackTitle;
            }

            var firstSentence = description
                .Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault()?
                .Trim();

            if (string.IsNullOrWhiteSpace(firstSentence))
            {
                return fallbackTitle;
            }

            return firstSentence.Length > 60
                ? $"{firstSentence.Substring(0, 57)}..."
                : firstSentence;
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
