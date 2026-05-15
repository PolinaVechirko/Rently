using Microsoft.EntityFrameworkCore;
using Rently.Application.Exceptions;
using Rently.Persistence;

namespace Rently.Application.Services.Bookings;

public class BookingAvailabilityService
{
    private readonly ApplicationDbContext _dbContext;

    public BookingAvailabilityService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task EnsureAccommodationExistsAsync(int accommodationId, CancellationToken cancellationToken = default)
    {
        var exists = await _dbContext.Accommodations.AnyAsync(accommodation => accommodation.Id == accommodationId, cancellationToken);
        if (!exists)
        {
            throw new NotFoundException("Accommodation not found.");
        }
    }

    public async Task EnsureAvailableAsync(
        int accommodationId,
        DateTime checkIn,
        DateTime checkOut,
        int? ignoredBookingId = null,
        CancellationToken cancellationToken = default)
    {
        var hasOverlappingBooking = await _dbContext.Bookings.AnyAsync(booking =>
            booking.AccommodationId == accommodationId &&
            (!ignoredBookingId.HasValue || booking.Id != ignoredBookingId.Value) &&
            booking.Status != Rently.Domain.Entities.BookingStatus.Cancelled &&
            checkIn < booking.CheckOutDate &&
            checkOut > booking.CheckInDate, cancellationToken);

        if (hasOverlappingBooking)
        {
            throw new ConflictException("Accommodation is not available for these dates.");
        }

        var hasAvailabilityBlock = await _dbContext.AvailabilityBlocks.AnyAsync(block =>
            block.AccommodationId == accommodationId &&
            checkIn < block.EndDate &&
            checkOut > block.StartDate, cancellationToken);

        if (hasAvailabilityBlock)
        {
            throw new ConflictException("Accommodation is blocked for these dates.");
        }
    }
}
