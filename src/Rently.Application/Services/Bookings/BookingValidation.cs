using Rently.Domain.Entities;

namespace Rently.Application.Services.Bookings;

internal static class BookingValidation
{
    public static (DateTime CheckIn, DateTime CheckOut) NormalizeDates(DateTime checkIn, DateTime checkOut)
    {
        return (checkIn.Date, checkOut.Date);
    }

    public static void EnsurePendingStatus(Booking booking, string errorMessage)
    {
        if (booking.Status != BookingStatus.Pending)
        {
            throw new InvalidOperationException(errorMessage);
        }
    }
}
