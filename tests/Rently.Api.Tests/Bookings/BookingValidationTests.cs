using Rently.Application.Services.Bookings;
using Rently.Domain.Entities;

namespace Rently.Api.Tests.Bookings;

public class BookingValidationTests
{
    [Fact]
    public void NormalizeDates_StripsTimeComponent()
    {
        var checkIn = new DateTime(2026, 5, 20, 14, 30, 0);
        var checkOut = new DateTime(2026, 5, 25, 9, 15, 0);

        var normalized = BookingValidation.NormalizeDates(checkIn, checkOut);

        Assert.Equal(new DateTime(2026, 5, 20), normalized.CheckIn);
        Assert.Equal(new DateTime(2026, 5, 25), normalized.CheckOut);
    }

    [Fact]
    public void EnsurePendingStatus_ThrowsForNonPendingBooking()
    {
        var booking = new Booking
        {
            Status = BookingStatus.Confirmed
        };

        var exception = Assert.Throws<InvalidOperationException>(() =>
            BookingValidation.EnsurePendingStatus(booking, "Only pending bookings can be cancelled."));

        Assert.Equal("Only pending bookings can be cancelled.", exception.Message);
    }
}
