using Rently.Domain.Entities;

namespace Rently.Application.Services.Accommodations;

internal static class AccommodationSorting
{
    public static List<Accommodation> ApplyListSorting(List<Accommodation> accommodations, string? sortBy)
    {
        return sortBy switch
        {
            "highest_rated" => accommodations
                .OrderByDescending(accommodation => CalculateWeightedRating(accommodation, accommodations))
                .ToList(),
            "most_visited" => accommodations
                .OrderByDescending(accommodation => accommodation.Bookings?.Count ?? 0)
                .ToList(),
            "price_asc" => accommodations.OrderBy(accommodation => accommodation.PricePerNight).ToList(),
            "price_desc" => accommodations.OrderByDescending(accommodation => accommodation.PricePerNight).ToList(),
            _ => accommodations
        };
    }

    public static IEnumerable<Accommodation> ApplySearchSorting(IEnumerable<Accommodation> accommodations, string? sortBy)
    {
        var accommodationList = accommodations.ToList();

        return sortBy?.ToLower() switch
        {
            "highest_rated" or "top rated" => accommodationList.OrderByDescending(accommodation =>
                CalculateWeightedRating(accommodation, accommodationList)),
            "most_visited" or "popularity" or "most visited" => accommodationList.OrderByDescending(accommodation =>
                accommodation.Bookings?.Count(booking => booking.Status == BookingStatus.Confirmed) ?? 0),
            "price_asc" or "price: low to high" or "price_low_high" => accommodationList.OrderBy(accommodation =>
                (double)accommodation.PricePerNight),
            "price_desc" or "price: high to low" or "price_high_low" => accommodationList.OrderByDescending(accommodation =>
                (double)accommodation.PricePerNight),
            "newest" => accommodationList.OrderByDescending(accommodation => accommodation.CreatedAt),
            _ => accommodationList.OrderByDescending(accommodation => accommodation.CreatedAt)
        };
    }

    private static double CalculateWeightedRating(
        Accommodation accommodation,
        IReadOnlyCollection<Accommodation> allAccommodations)
    {
        var reviewCounts = allAccommodations
            .Select(item => item.Reviews?.Count ?? 0)
            .Where(count => count > 0)
            .OrderBy(count => count)
            .ToList();

        if (reviewCounts.Count == 0)
        {
            return 0.0;
        }

        var accommodationsWithReviews = allAccommodations
            .Where(item => item.Reviews != null && item.Reviews.Any())
            .ToList();

        var globalAverage = accommodationsWithReviews.Average(item =>
            item.Reviews!.Average(review => (double)review.Rating));

        var medianReviewCount = GetMedianReviewCount(reviewCounts);
        var reviewCount = accommodation.Reviews?.Count ?? 0;

        if (reviewCount == 0)
        {
            return globalAverage;
        }

        var averageRating = accommodation.Reviews!.Average(review => (double)review.Rating);
        return (reviewCount / (reviewCount + medianReviewCount)) * averageRating
            + (medianReviewCount / (reviewCount + medianReviewCount)) * globalAverage;
    }

    private static double GetMedianReviewCount(IReadOnlyList<int> sortedReviewCounts)
    {
        var middleIndex = sortedReviewCounts.Count / 2;
        return sortedReviewCounts.Count % 2 == 0
            ? (sortedReviewCounts[middleIndex - 1] + sortedReviewCounts[middleIndex]) / 2.0
            : sortedReviewCounts[middleIndex];
    }
}
