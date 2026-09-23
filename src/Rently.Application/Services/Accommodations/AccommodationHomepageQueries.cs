using Microsoft.EntityFrameworkCore;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Accommodations;

internal static class AccommodationHomepageQueries
{
    public static async Task<List<HomepageAccommodationRow>> GetHighestRatedAsync(
        ApplicationDbContext dbContext,
        DateTime today,
        int count,
        CancellationToken cancellationToken = default)
    {
        var reviewedAccommodations = AccommodationQueries.BuildVisibleQuery(dbContext, today)
            .Where(accommodation => accommodation.Reviews!.Any());

        var sortedQuery = (await AccommodationSorting.OrderByWeightedRatingAsync(reviewedAccommodations, cancellationToken))
            .ThenByDescending(accommodation => accommodation.Bookings!.Count(booking => booking.Status == BookingStatus.Confirmed))
            .ThenByDescending(accommodation => accommodation.CreatedAt);

        return await ProjectRows(dbContext, sortedQuery)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    public static Task<List<HomepageAccommodationRow>> GetMostVisitedAsync(
        ApplicationDbContext dbContext,
        DateTime today,
        int count,
        int skip,
        CancellationToken cancellationToken = default)
    {
        return ProjectRows(dbContext, AccommodationQueries.BuildVisibleQuery(dbContext, today))
            .OrderByDescending(row => row.Popularity)
            .ThenByDescending(row => row.AvgRating)
            .ThenByDescending(row => row.ReviewsCount)
            .Skip(skip)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    private static IQueryable<HomepageAccommodationRow> ProjectRows(
        ApplicationDbContext dbContext,
        IQueryable<Accommodation> accommodations)
    {
        return accommodations
            .Select(accommodation => new HomepageAccommodationRow
            {
                Id = accommodation.Id,
                HostId = accommodation.HostId,
                PropertyType = accommodation.PropertyType,
                PricePerNight = accommodation.PricePerNight,
                RoomsCount = accommodation.RoomsCount,
                BedsCount = accommodation.BedsCount,
                Description = accommodation.Description,
                Title = accommodation.Title,
                CreatedAt = accommodation.CreatedAt,
                IsActive = accommodation.IsActive,
                VisibleFrom = accommodation.VisibleFrom,
                Country = accommodation.Address != null ? accommodation.Address.Country : "",
                City = accommodation.Address != null ? accommodation.Address.City : "",
                Street = accommodation.Address != null ? accommodation.Address.Street : null,
                ReviewsCount = dbContext.Reviews.Count(review => review.AccommodationId == accommodation.Id),
                AvgRating = dbContext.Reviews
                    .Where(review => review.AccommodationId == accommodation.Id)
                    .Select(review => (double?)review.Rating)
                    .Average() ?? 0.0,
                Popularity = dbContext.Bookings.Count(booking =>
                    booking.AccommodationId == accommodation.Id &&
                    booking.Status == BookingStatus.Confirmed),
                FirstPhoto =
                    dbContext.Photos
                        .Where(photo => photo.Id == accommodation.CoverPhotoId)
                        .Select(photo => photo.Url)
                        .FirstOrDefault()
                    ?? dbContext.Photos
                        .Where(photo => photo.AccommodationId == accommodation.Id)
                        .OrderBy(photo => photo.SortOrder)
                        .ThenBy(photo => photo.Id)
                        .Select(photo => photo.Url)
                        .FirstOrDefault()
            });
    }
}
