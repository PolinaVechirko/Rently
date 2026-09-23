using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Accommodations;

internal static class AccommodationQueries
{
    public static IQueryable<Accommodation> BuildVisibleQuery(ApplicationDbContext dbContext, DateTime today)
    {
        return dbContext.Accommodations
            .AsNoTracking()
            .Where(IsVisibleOnDate(today));
    }

    /// <summary>
    /// Takes one page of ids from an already sorted query and loads only those accommodations with their details.
    /// </summary>
    public static async Task<List<Accommodation>> LoadPageAsync(
        ApplicationDbContext dbContext,
        IQueryable<Accommodation> sortedQuery,
        int skip,
        int take,
        bool includeBookings,
        CancellationToken cancellationToken = default)
    {
        var pageIds = await sortedQuery
            .Skip(skip)
            .Take(take)
            .Select(accommodation => accommodation.Id)
            .ToListAsync(cancellationToken);

        if (pageIds.Count == 0)
        {
            return [];
        }

        var detailsQuery = dbContext.Accommodations
            .AsNoTracking()
            .Include(accommodation => accommodation.Address)
            .Include(accommodation => accommodation.AccommodationAmenities!)
                .ThenInclude(accommodationAmenity => accommodationAmenity.Amenity)
            .Include(accommodation => accommodation.Photos)
            .Include(accommodation => accommodation.Reviews)
            .Where(accommodation => pageIds.Contains(accommodation.Id));

        if (includeBookings)
        {
            detailsQuery = detailsQuery.Include(accommodation => accommodation.Bookings);
        }

        var accommodationsById = await detailsQuery.ToDictionaryAsync(accommodation => accommodation.Id, cancellationToken);
        return pageIds.Select(id => accommodationsById[id]).ToList();
    }

    public static Expression<Func<Accommodation, bool>> IsVisibleOnDate(DateTime date)
    {
        return accommodation =>
            accommodation.IsActive &&
            (!accommodation.VisibleFrom.HasValue || accommodation.VisibleFrom.Value.Date <= date);
    }
}
