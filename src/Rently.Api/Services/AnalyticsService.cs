using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Rently.Api.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private const int DefaultTopAmenitiesCount = 10;
        private const int MaxCityStatsCount = 50;
        private static readonly TimeSpan CityStatsCacheDuration = TimeSpan.FromMinutes(5);

        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public AnalyticsService(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<IEnumerable<AmenityPopularityDto>> GetTopAmenitiesAsync(int count = DefaultTopAmenitiesCount)
        {
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            return await _context.Bookings
                .Where(b => b.Status == BookingStatus.Confirmed && b.CheckInDate >= thirtyDaysAgo)
                .SelectMany(b => b.Accommodation!.AccommodationAmenities!)
                .GroupBy(aa => aa.Amenity!.Name)
                .Select(g => new AmenityPopularityDto
                {
                    Name = g.Key,
                    BookingCount = g.Count()
                })
                .OrderByDescending(x => x.BookingCount)
                .Take(count)
                .ToListAsync();
        }

        public async Task<IEnumerable<CityStatsDto>> GetCityStatsAsync(int count = DefaultTopAmenitiesCount)
        {
            var normalizedCount = NormalizeCityStatsCount(count);
            var cacheKey = BuildCityStatsCacheKey(normalizedCount);

            if (_cache.TryGetValue(cacheKey, out List<CityStatsDto>? cached) && cached != null)
            {
                return cached;
            }

            var stats = await _context.Accommodations
                .AsNoTracking()
                .Where(a => a.IsActive && a.Address != null)
                .GroupBy(a => a.Address!.City)
                .Select(g => new CityStatsDto
                {
                    City = g.Key,
                    ActiveHomesCount = g.Count(),
                    VisitorsCount = g
                        .SelectMany(a => a.Bookings!.Where(b => b.Status == BookingStatus.Confirmed))
                        .Select(b => b.GuestId)
                        .Distinct()
                        .Count()
                })
                .OrderByDescending(x => x.ActiveHomesCount)
                .ThenByDescending(x => x.VisitorsCount)
                .Take(normalizedCount)
                .ToListAsync();

            CacheCityStats(cacheKey, stats);

            return stats;
        }

        public async Task<HostDashboardStatsDto> GetHostDashboardStatsAsync(string hostId)
        {
            var host = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == hostId);
            if (host == null)
            {
                throw new InvalidOperationException("Host not found.");
            }

            var accommodations = await _context.Accommodations
                .AsNoTracking()
                .Where(a => a.HostId == hostId)
                .Include(a => a.Reviews)
                .Include(a => a.Bookings)
                .ToListAsync();

            var now = DateTime.UtcNow;
            var reviews = GetAllReviews(accommodations);
            var bookings = GetAllBookings(accommodations);

            return new HostDashboardStatsDto
            {
                HostName = host.FullName,
                Email = host.Email ?? string.Empty,
                PhoneNumber = host.PhoneNumber,
                ProfilePhotoUrl = host.ProfilePhotoUrl,
                AverageRating = CalculateAverageRating(reviews),
                Earnings = CalculateEarnings(accommodations, now),
                ResponseRate = CalculateResponseRate(bookings),
                ReviewsCount = reviews.Count,
                ListingsCount = accommodations.Count,
                ActiveListingsCount = accommodations.Count(a => a.IsActive),
                RentedListingsCount = accommodations.Count(a => IsCurrentlyRented(a, now)),
                HiddenListingsCount = accommodations.Count(a => !a.IsActive)
            };
        }

        private static int NormalizeCityStatsCount(int count) => Math.Clamp(count, 1, MaxCityStatsCount);

        private static string BuildCityStatsCacheKey(int count) => $"analytics:city-stats:v1:{count}";

        private void CacheCityStats(string cacheKey, List<CityStatsDto> stats)
        {
            _cache.Set(cacheKey, stats, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = CityStatsCacheDuration
            });
        }

        private static List<Review> GetAllReviews(IEnumerable<Accommodation> accommodations) =>
            accommodations.SelectMany(a => a.Reviews ?? []).ToList();

        private static List<Booking> GetAllBookings(IEnumerable<Accommodation> accommodations) =>
            accommodations.SelectMany(a => a.Bookings ?? []).ToList();

        private static bool IsCurrentlyRented(Accommodation accommodation, DateTime now) =>
            accommodation.IsActive &&
            (accommodation.Bookings?.Any(b =>
                b.Status == BookingStatus.Confirmed &&
                b.CheckInDate <= now &&
                b.CheckOutDate >= now) ?? false);

        private static double CalculateAverageRating(IReadOnlyCollection<Review> reviews) =>
            reviews.Count > 0 ? reviews.Average(r => (double)r.Rating) : 0;

        private static double CalculateResponseRate(IReadOnlyCollection<Booking> bookings)
        {
            var allBookingsCount = bookings.Count;
            if (allBookingsCount == 0)
            {
                return 100.0;
            }

            var confirmedBookingsCount = bookings.Count(b => b.Status == BookingStatus.Confirmed);
            return (double)confirmedBookingsCount / allBookingsCount * 100.0;
        }

        private static decimal CalculateEarnings(IEnumerable<Accommodation> accommodations, DateTime now)
        {
            decimal earnings = 0;

            foreach (var accommodation in accommodations)
            {
                var confirmedPastBookings = accommodation.Bookings?
                    .Where(b => b.Status == BookingStatus.Confirmed && b.CheckInDate < now)
                    .ToList() ?? [];

                foreach (var booking in confirmedPastBookings)
                {
                    var nights = (decimal)(booking.CheckOutDate - booking.CheckInDate).TotalDays;
                    if (nights > 0)
                    {
                        earnings += nights * accommodation.PricePerNight;
                    }
                }
            }

            return earnings;
        }
    }
}
