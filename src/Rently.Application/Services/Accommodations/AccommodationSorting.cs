using Rently.Domain.Entities;

namespace Rently.Application.Services.Accommodations;

internal static class AccommodationSorting
{
    public static List<Accommodation> ApplyListSorting(List<Accommodation> accommodations, string? sortBy)
    {
        return sortBy switch
        {
            "highest_rated" => accommodations
                .OrderByDescending(accommodation =>
                    accommodation.Reviews != null && accommodation.Reviews.Any()
                        ? accommodation.Reviews.Average(review => review.Rating)
                        : 0)
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
        return sortBy?.ToLower() switch
        {
            "highest_rated" or "top rated" => accommodations.OrderByDescending(accommodation =>
                accommodation.Reviews != null && accommodation.Reviews.Any()
                    ? accommodation.Reviews.Average(review => (double)review.Rating)
                    : 0.0),
            "most_visited" or "popularity" or "most visited" => accommodations.OrderByDescending(accommodation =>
                accommodation.Bookings?.Count(booking => booking.Status == BookingStatus.Confirmed) ?? 0),
            "price_asc" or "price: low to high" or "price_low_high" => accommodations.OrderBy(accommodation =>
                (double)accommodation.PricePerNight),
            "price_desc" or "price: high to low" or "price_high_low" => accommodations.OrderByDescending(accommodation =>
                (double)accommodation.PricePerNight),
            "newest" => accommodations.OrderByDescending(accommodation => accommodation.CreatedAt),
            _ => accommodations.OrderByDescending(accommodation => accommodation.CreatedAt)
        };
    }
}
