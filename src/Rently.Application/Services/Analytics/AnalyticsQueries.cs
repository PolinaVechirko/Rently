using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Analytics;

internal static class AnalyticsQueries
{
    public static Task<List<AmenityPopularityDto>> GetTopAmenitiesAsync(
        ApplicationDbContext dbContext,
        DateTime fromDate,
        int count,
        CancellationToken cancellationToken = default)
    {
        return dbContext.Bookings
            .Where(booking => booking.Status == BookingStatus.Confirmed && booking.CheckInDate >= fromDate)
            .SelectMany(booking => booking.Accommodation!.AccommodationAmenities!)
            .GroupBy(accommodationAmenity => accommodationAmenity.Amenity!.Name)
            .Select(group => new AmenityPopularityDto
            {
                Name = group.Key,
                BookingCount = group.Count()
            })
            .OrderByDescending(stat => stat.BookingCount)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    public static Task<List<CityStatsDto>> GetCityStatsAsync(
        ApplicationDbContext dbContext,
        int count,
        CancellationToken cancellationToken = default)
    {
        return dbContext.Accommodations
            .AsNoTracking()
            .Where(accommodation => accommodation.IsActive && accommodation.Address != null)
            .GroupBy(accommodation => accommodation.Address!.City)
            .Select(group => new CityStatsDto
            {
                City = group.Key,
                ActiveHomesCount = group.Count(),
                VisitorsCount = group
                    .SelectMany(accommodation => accommodation.Bookings!.Where(booking => booking.Status == BookingStatus.Confirmed))
                    .Select(booking => booking.GuestId)
                    .Distinct()
                    .Count()
            })
            .OrderByDescending(stat => stat.ActiveHomesCount)
            .ThenByDescending(stat => stat.VisitorsCount)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    public static Task<ApplicationUser?> GetHostAsync(
        ApplicationDbContext dbContext,
        string hostId,
        CancellationToken cancellationToken = default)
    {
        return dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(user => user.Id == hostId, cancellationToken);
    }

    public static Task<List<Accommodation>> GetHostAccommodationsAsync(
        ApplicationDbContext dbContext,
        string hostId,
        CancellationToken cancellationToken = default)
    {
        return dbContext.Accommodations
            .AsNoTracking()
            .Where(accommodation => accommodation.HostId == hostId)
            .Include(accommodation => accommodation.Reviews)
            .Include(accommodation => accommodation.Bookings)
            .ToListAsync(cancellationToken);
    }
}
