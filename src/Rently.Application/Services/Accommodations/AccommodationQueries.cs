using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Accommodations;

internal static class AccommodationQueries
{
    public static IQueryable<Accommodation> BuildAccommodationListQuery(
        ApplicationDbContext dbContext,
        DateTime today)
    {
        return dbContext.Accommodations
            .Include(accommodation => accommodation.Address)
            .Include(accommodation => accommodation.AccommodationAmenities!)
                .ThenInclude(accommodationAmenity => accommodationAmenity.Amenity)
            .Include(accommodation => accommodation.Photos)
            .Include(accommodation => accommodation.Reviews)
            .Include(accommodation => accommodation.Bookings)
            .Where(IsVisibleOnDate(today));
    }

    public static IQueryable<Accommodation> BuildAccommodationSearchQuery(
        ApplicationDbContext dbContext,
        DateTime today)
    {
        return dbContext.Accommodations
            .AsNoTracking()
            .Where(IsVisibleOnDate(today));
    }

    public static Task<List<Accommodation>> LoadSearchResultsAsync(IQueryable<Accommodation> query, CancellationToken cancellationToken = default)
    {
        return query
            .Include(accommodation => accommodation.Address)
            .Include(accommodation => accommodation.Photos)
            .Include(accommodation => accommodation.Reviews)
            .Include(accommodation => accommodation.AccommodationAmenities!)
                .ThenInclude(accommodationAmenity => accommodationAmenity.Amenity)
            .ToListAsync(cancellationToken);
    }

    public static Expression<Func<Accommodation, bool>> IsVisibleOnDate(DateTime date)
    {
        return accommodation =>
            accommodation.IsActive &&
            (!accommodation.VisibleFrom.HasValue || accommodation.VisibleFrom.Value.Date <= date);
    }
}
