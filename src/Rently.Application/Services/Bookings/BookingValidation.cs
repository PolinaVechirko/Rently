using Rently.Domain.Entities;

namespace Rently.Application.Services.Bookings;

internal static class BookingValidation
{
    public static void EnsurePendingStatus(Booking booking, string errorMessage)
    {
        if (booking.Status != BookingStatus.Pending)
        {
            throw new InvalidOperationException(errorMessage);
        }
    }
}
