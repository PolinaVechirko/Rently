using Rently.Application.Exceptions;
using Rently.Application.Services.Bookings;
using Rently.Domain.Entities;

namespace Rently.Api.Tests.Bookings;

public class BookingAvailabilityServiceTests
{
    [Fact]
    public async Task EnsureAccommodationExistsAsync_MissingAccommodation_ThrowsNotFoundException()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        var service = new BookingAvailabilityService(db);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            service.EnsureAccommodationExistsAsync(404));

        Assert.Equal("Accommodation not found.", exception.Message);
    }

    [Fact]
    public async Task EnsureAvailableAsync_OverlappingConfirmedBooking_ThrowsConflictException()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Bookings.Add(new Booking
        {
            AccommodationId = 1,
            GuestId = "guest-1",
            Status = BookingStatus.Confirmed,
            CheckInDate = new DateTime(2026, 6, 10),
            CheckOutDate = new DateTime(2026, 6, 15)
        });
        await db.SaveChangesAsync();

        var service = new BookingAvailabilityService(db);

        var exception = await Assert.ThrowsAsync<ConflictException>(() =>
            service.EnsureAvailableAsync(1, new DateTime(2026, 6, 12), new DateTime(2026, 6, 14)));

        Assert.Equal("Accommodation is not available for these dates.", exception.Message);
    }

    [Fact]
    public async Task EnsureAvailableAsync_IgnoredBookingId_SkipsOverlapCheck()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Bookings.Add(new Booking
        {
            Id = 55,
            AccommodationId = 1,
            GuestId = "guest-1",
            Status = BookingStatus.Confirmed,
            CheckInDate = new DateTime(2026, 6, 10),
            CheckOutDate = new DateTime(2026, 6, 15)
        });
        await db.SaveChangesAsync();

        var service = new BookingAvailabilityService(db);

        await service.EnsureAvailableAsync(
            1,
            new DateTime(2026, 6, 12),
            new DateTime(2026, 6, 14),
            ignoredBookingId: 55);
    }

    [Fact]
    public async Task EnsureAvailableAsync_OverlappingAvailabilityBlock_ThrowsConflictException()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.AvailabilityBlocks.Add(new AvailabilityBlock
        {
            AccommodationId = 1,
            StartDate = new DateTime(2026, 7, 1),
            EndDate = new DateTime(2026, 7, 5)
        });
        await db.SaveChangesAsync();

        var service = new BookingAvailabilityService(db);

        var exception = await Assert.ThrowsAsync<ConflictException>(() =>
            service.EnsureAvailableAsync(1, new DateTime(2026, 7, 2), new DateTime(2026, 7, 4)));

        Assert.Equal("Accommodation is blocked for these dates.", exception.Message);
    }

    [Fact]
    public async Task EnsureAvailableAsync_BookingStartsOnExistingCheckoutDate_DoesNotThrow()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Bookings.Add(new Booking
        {
            AccommodationId = 2,
            GuestId = "guest-1",
            Status = BookingStatus.Confirmed,
            CheckInDate = new DateTime(2026, 6, 10),
            CheckOutDate = new DateTime(2026, 6, 15)
        });
        await db.SaveChangesAsync();

        var service = new BookingAvailabilityService(db);

        await service.EnsureAvailableAsync(2, new DateTime(2026, 6, 15), new DateTime(2026, 6, 18));
    }

    [Fact]
    public async Task EnsureAvailableAsync_BookingEndsOnExistingCheckInDate_DoesNotThrow()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Bookings.Add(new Booking
        {
            AccommodationId = 3,
            GuestId = "guest-1",
            Status = BookingStatus.Confirmed,
            CheckInDate = new DateTime(2026, 6, 10),
            CheckOutDate = new DateTime(2026, 6, 15)
        });
        await db.SaveChangesAsync();

        var service = new BookingAvailabilityService(db);

        await service.EnsureAvailableAsync(3, new DateTime(2026, 6, 7), new DateTime(2026, 6, 10));
    }
}
