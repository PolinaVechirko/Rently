using Rently.Application.DTOs;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Analytics;

internal static class AnalyticsCalculations
{
    public static HostDashboardStatsDto BuildHostDashboardStats(
        ApplicationUser host,
        IReadOnlyCollection<Accommodation> accommodations,
        DateTime now)
    {
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
            ActiveListingsCount = accommodations.Count(accommodation => accommodation.IsActive),
            RentedListingsCount = accommodations.Count(accommodation => IsCurrentlyRented(accommodation, now)),
            HiddenListingsCount = accommodations.Count(accommodation => !accommodation.IsActive)
        };
    }

    private static List<Review> GetAllReviews(IEnumerable<Accommodation> accommodations) =>
        accommodations.SelectMany(accommodation => accommodation.Reviews ?? []).ToList();

    private static List<Booking> GetAllBookings(IEnumerable<Accommodation> accommodations) =>
        accommodations.SelectMany(accommodation => accommodation.Bookings ?? []).ToList();

    private static bool IsCurrentlyRented(Accommodation accommodation, DateTime now) =>
        accommodation.IsActive &&
        (accommodation.Bookings?.Any(booking =>
            booking.Status == BookingStatus.Confirmed &&
            booking.CheckInDate <= now &&
            booking.CheckOutDate >= now) ?? false);

    private static double CalculateAverageRating(IReadOnlyCollection<Review> reviews) =>
        reviews.Count > 0 ? reviews.Average(review => (double)review.Rating) : 0;

    private static double CalculateResponseRate(IReadOnlyCollection<Booking> bookings)
    {
        var allBookingsCount = bookings.Count;
        if (allBookingsCount == 0)
        {
            return 100.0;
        }

        var confirmedBookingsCount = bookings.Count(booking => booking.Status == BookingStatus.Confirmed);
        return (double)confirmedBookingsCount / allBookingsCount * 100.0;
    }

    private static decimal CalculateEarnings(IEnumerable<Accommodation> accommodations, DateTime now)
    {
        decimal earnings = 0;

        foreach (var accommodation in accommodations)
        {
            var confirmedPastBookings = accommodation.Bookings?
                .Where(booking => booking.Status == BookingStatus.Confirmed && booking.CheckInDate < now)
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
