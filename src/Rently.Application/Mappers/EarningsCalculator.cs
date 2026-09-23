using Rently.Domain.Entities;

namespace Rently.Application.Mappers;

internal static class EarningsCalculator
{
    /// <summary>
    /// Sums nights of confirmed stays that have already started, priced at the current nightly rate.
    /// </summary>
    public static decimal ForAccommodation(Accommodation accommodation, DateTime now)
    {
        return (accommodation.Bookings ?? [])
            .Where(booking => booking.Status == BookingStatus.Confirmed && booking.CheckInDate < now)
            .Select(booking => (decimal)(booking.CheckOutDate - booking.CheckInDate).TotalDays)
            .Where(nights => nights > 0)
            .Sum(nights => nights * accommodation.PricePerNight);
    }
}
