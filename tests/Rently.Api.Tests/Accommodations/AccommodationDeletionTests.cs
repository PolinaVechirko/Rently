using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Rently.Application.Exceptions;
using Rently.Application.Services.Accommodations;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Api.Tests.Accommodations;

public class AccommodationDeletionTests
{
    [Fact]
    public async Task DeleteAccommodationAsync_WithConfirmedReservation_ThrowsConflictException()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        var accommodation = CreateAccommodation(id: 10, hostId: "host-1");
        db.Accommodations.Add(accommodation);
        db.Bookings.Add(new Booking
        {
            AccommodationId = accommodation.Id,
            GuestId = "guest-1",
            Status = BookingStatus.Confirmed,
            CheckInDate = new DateTime(2026, 6, 10),
            CheckOutDate = new DateTime(2026, 6, 12)
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var exception = await Assert.ThrowsAsync<ConflictException>(() =>
            service.DeleteAccommodationAsync(accommodation.Id, accommodation.HostId));

        Assert.Equal(
            "This apartment cannot be deleted while it has confirmed reservations.",
            exception.Message);
        Assert.True(await db.Accommodations.AnyAsync(item => item.Id == accommodation.Id));
    }

    [Fact]
    public async Task DeleteAccommodationAsync_WithPendingReservation_DeletesAccommodation()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        var accommodation = CreateAccommodation(id: 11, hostId: "host-1");
        db.Accommodations.Add(accommodation);
        db.Bookings.Add(new Booking
        {
            AccommodationId = accommodation.Id,
            GuestId = "guest-2",
            Status = BookingStatus.Pending,
            CheckInDate = new DateTime(2026, 7, 1),
            CheckOutDate = new DateTime(2026, 7, 4)
        });
        await db.SaveChangesAsync();

        var service = CreateService(db);

        var deleted = await service.DeleteAccommodationAsync(accommodation.Id, accommodation.HostId);

        Assert.True(deleted);
        Assert.False(await db.Accommodations.AnyAsync(item => item.Id == accommodation.Id));
    }

    private static AccommodationService CreateService(ApplicationDbContext db)
    {
        return new AccommodationService(
            db,
            new MemoryCache(new MemoryCacheOptions()),
            NullLogger<AccommodationService>.Instance);
    }

    private static Accommodation CreateAccommodation(int id, string hostId)
    {
        return new Accommodation
        {
            Id = id,
            HostId = hostId,
            AddressId = id,
            Title = $"Accommodation {id}",
            Address = new Address
            {
                Country = "Poland",
                City = "Warsaw"
            }
        };
    }
}
