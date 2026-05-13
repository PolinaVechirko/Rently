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
    public class AnalyticsService : Rently.Application.Interfaces.IAnalyticsService
    {
        private readonly ApplicationDbContext _context;
        private readonly IMemoryCache _cache;

        public AnalyticsService(ApplicationDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        public async Task<IEnumerable<AmenityPopularityDto>> GetTopAmenitiesAsync(int count = 10)
        {
            // Calculate popularity based on confirmed bookings in the last 30 days
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);

            var query = await _context.Bookings
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

            return query;
        }

        public async Task<IEnumerable<CityStatsDto>> GetCityStatsAsync(int count = 10)
        {
            count = Math.Clamp(count, 1, 50);
            var cacheKey = $"analytics:city-stats:v1:{count}";

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
                .Take(count)
                .ToListAsync();

            _cache.Set(cacheKey, stats, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            });

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

            var listingsCount = accommodations.Count;
            var activeListingsCount = accommodations.Count(a => a.IsActive);

            var rentedListingsCount = accommodations.Count(a =>
                a.IsActive &&
                (a.Bookings?.Any(b =>
                    b.Status == BookingStatus.Confirmed &&
                    b.CheckInDate <= DateTime.UtcNow &&
                    b.CheckOutDate >= DateTime.UtcNow) ?? false));

            var hiddenListingsCount = accommodations.Count(a => !a.IsActive);

            var allReviews = accommodations.SelectMany(a => a.Reviews ?? new List<Review>()).ToList();
            var averageRating = allReviews.Count > 0
                ? allReviews.Average(r => (double)r.Rating)
                : 0;

            var confirmedBookings = accommodations.SelectMany(a => a.Bookings ?? new List<Booking>())
                .Count(b => b.Status == BookingStatus.Confirmed);
            var allBookings = accommodations.SelectMany(a => a.Bookings ?? new List<Booking>()).Count();
            var responseRate = allBookings > 0
                ? (double)confirmedBookings / allBookings * 100.0
                : 100.0;

            decimal earnings = 0;
            foreach (var accommodation in accommodations)
            {
                var confirmedPastBookings = accommodation.Bookings?
                    .Where(b => b.Status == BookingStatus.Confirmed && b.CheckInDate < DateTime.UtcNow)
                    .ToList() ?? new List<Booking>();

                foreach (var booking in confirmedPastBookings)
                {
                    var nights = (decimal)(booking.CheckOutDate - booking.CheckInDate).TotalDays;
                    if (nights > 0)
                    {
                        earnings += nights * accommodation.PricePerNight;
                    }
                }
            }

            return new HostDashboardStatsDto
            {
                HostName = host.FullName,
                Email = host.Email ?? string.Empty,
                PhoneNumber = host.PhoneNumber,
                ProfilePhotoUrl = host.ProfilePhotoUrl,
                AverageRating = averageRating,
                Earnings = earnings,
                ResponseRate = responseRate,
                ReviewsCount = allReviews.Count,
                ListingsCount = listingsCount,
                ActiveListingsCount = activeListingsCount,
                RentedListingsCount = rentedListingsCount,
                HiddenListingsCount = hiddenListingsCount
            };
        }
    }
}
