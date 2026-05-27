using Microsoft.EntityFrameworkCore;
using Rently.Persistence;

namespace Rently.Application.Services.Accommodations;

internal static class AccommodationHomepageQueries
{
    private const int WeightedRatingReviewThreshold = 20;

    public static async Task<IReadOnlyList<HomepageAccommodationRow>> GetHighestRatedAsync(
        ApplicationDbContext dbContext,
        DateTime today,
        int count,
        CancellationToken cancellationToken = default)
    {
        var reviewsTotal = await dbContext.Reviews.AsNoTracking().CountAsync(cancellationToken);
        var averageRating = reviewsTotal == 0
            ? 0.0
            : await dbContext.Reviews.AsNoTracking().AverageAsync(review => (double)review.Rating, cancellationToken);

        return await BaseHomepageQuery(dbContext, today)
            .Where(row => row.ReviewsCount > 0)
            .OrderByDescending(row =>
                ((double)row.ReviewsCount / (row.ReviewsCount + WeightedRatingReviewThreshold)) * row.AvgRating +
                ((double)WeightedRatingReviewThreshold / (row.ReviewsCount + WeightedRatingReviewThreshold)) * averageRating +
                ((double)row.Popularity / 1000.0))
            .ThenByDescending(row => row.Popularity)
            .ThenByDescending(row => row.CreatedAt)
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
        return BaseHomepageQuery(dbContext, today)
            .OrderByDescending(row => row.Popularity)
            .ThenByDescending(row => row.AvgRating)
            .ThenByDescending(row => row.ReviewsCount)
            .Skip(skip)
            .Take(count)
            .ToListAsync(cancellationToken);
    }

    private static IQueryable<HomepageAccommodationRow> BaseHomepageQuery(ApplicationDbContext dbContext, DateTime today)
    {
        return dbContext.Accommodations
            .AsNoTracking()
            .Where(AccommodationQueries.IsVisibleOnDate(today))
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
                    booking.Status == Rently.Domain.Entities.BookingStatus.Confirmed),
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
