using Microsoft.EntityFrameworkCore;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Availability;

public class AvailabilityBlockRulesService
{
    private readonly ApplicationDbContext _dbContext;

    public AvailabilityBlockRulesService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<bool> HostOwnsAccommodationAsync(string hostId, int accommodationId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Accommodations
            .AsNoTracking()
            .AnyAsync(accommodation => accommodation.Id == accommodationId && accommodation.HostId == hostId, cancellationToken);
    }

    public async Task EnsureNoConfirmedBookingOverlapAsync(int accommodationId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var overlapsWithBookings = await _dbContext.Bookings.AnyAsync(booking =>
            booking.AccommodationId == accommodationId &&
            booking.Status == BookingStatus.Confirmed &&
            booking.CheckOutDate > today &&
            startDate < booking.CheckOutDate &&
            endDate > booking.CheckInDate, cancellationToken);

        if (overlapsWithBookings)
        {
            throw new InvalidOperationException("You cannot block dates that overlap with confirmed upcoming bookings.");
        }
    }

    public async Task CancelOverlappingPendingBookingsAsync(int accommodationId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        var overlappingPendingBookings = await _dbContext.Bookings
            .Where(booking =>
                booking.AccommodationId == accommodationId &&
                booking.Status == BookingStatus.Pending &&
                startDate < booking.CheckOutDate &&
                endDate > booking.CheckInDate)
            .ToListAsync(cancellationToken);

        foreach (var booking in overlappingPendingBookings)
        {
            booking.Status = BookingStatus.Cancelled;
        }
    }
}
