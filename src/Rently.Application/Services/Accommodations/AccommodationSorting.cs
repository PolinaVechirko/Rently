using Microsoft.EntityFrameworkCore;
using Rently.Domain.Entities;

namespace Rently.Application.Services.Accommodations;

internal enum AccommodationSortOrder
{
    Unsorted,
    Newest,
    HighestRated,
    MostVisited,
    PriceAscending,
    PriceDescending
}

/// <summary>
/// Sorting translated to SQL, so only the requested page is loaded from the database.
/// </summary>
internal static class AccommodationSorting
{
    public static AccommodationSortOrder Parse(string? sortBy, AccommodationSortOrder fallback)
    {
        return sortBy?.Trim().ToLowerInvariant() switch
        {
            "highest_rated" or "top rated" => AccommodationSortOrder.HighestRated,
            "most_visited" or "most visited" or "popularity" => AccommodationSortOrder.MostVisited,
            "price_asc" or "price: low to high" or "price_low_high" => AccommodationSortOrder.PriceAscending,
            "price_desc" or "price: high to low" or "price_high_low" => AccommodationSortOrder.PriceDescending,
            "newest" => AccommodationSortOrder.Newest,
            _ => fallback
        };
    }

    public static async Task<IQueryable<Accommodation>> ApplyAsync(
        IQueryable<Accommodation> query,
        AccommodationSortOrder sortOrder,
        CancellationToken cancellationToken = default)
    {
        return sortOrder switch
        {
            AccommodationSortOrder.HighestRated =>
                (await OrderByWeightedRatingAsync(query, cancellationToken)).ThenBy(accommodation => accommodation.Id),
            AccommodationSortOrder.MostVisited => query
                .OrderByDescending(accommodation => accommodation.Bookings!.Count(booking => booking.Status == BookingStatus.Confirmed))
                .ThenBy(accommodation => accommodation.Id),
            // SQLite cannot order by decimal columns directly, so the price is compared as REAL.
            AccommodationSortOrder.PriceAscending => query
                .OrderBy(accommodation => (double)accommodation.PricePerNight)
                .ThenBy(accommodation => accommodation.Id),
            AccommodationSortOrder.PriceDescending => query
                .OrderByDescending(accommodation => (double)accommodation.PricePerNight)
                .ThenBy(accommodation => accommodation.Id),
            AccommodationSortOrder.Newest => query
                .OrderByDescending(accommodation => accommodation.CreatedAt)
                .ThenBy(accommodation => accommodation.Id),
            _ => query.OrderBy(accommodation => accommodation.Id)
        };
    }

    /// <summary>
    /// Bayesian average: listings with few reviews are pulled towards the average rating of the candidate set,
    /// using the median review count of that set as the confidence weight.
    /// </summary>
    public static async Task<IOrderedQueryable<Accommodation>> OrderByWeightedRatingAsync(
        IQueryable<Accommodation> query,
        CancellationToken cancellationToken = default)
    {
        var reviewCounts = await query
            .Select(accommodation => accommodation.Reviews!.Count())
            .Where(count => count > 0)
            .ToListAsync(cancellationToken);

        if (reviewCounts.Count == 0)
        {
            return query.OrderBy(accommodation => 0);
        }

        var averageRatings = await query
            .Where(accommodation => accommodation.Reviews!.Any())
            .Select(accommodation => accommodation.Reviews!.Average(review => (double)review.Rating))
            .ToListAsync(cancellationToken);

        var globalAverage = averageRatings.Average();
        var medianReviewCount = GetMedian(reviewCounts);

        return query.OrderByDescending(accommodation =>
            accommodation.Reviews!.Count() == 0
                ? globalAverage
                : accommodation.Reviews!.Count() / (accommodation.Reviews!.Count() + medianReviewCount)
                    * accommodation.Reviews!.Average(review => (double)review.Rating)
                  + medianReviewCount / (accommodation.Reviews!.Count() + medianReviewCount) * globalAverage);
    }

    private static double GetMedian(List<int> values)
    {
        values.Sort();
        var middleIndex = values.Count / 2;
        return values.Count % 2 == 0
            ? (values[middleIndex - 1] + values[middleIndex]) / 2.0
            : values[middleIndex];
    }
}
