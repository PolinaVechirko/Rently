using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Api.Services;

public class AvailabilityBlockService : IAvailabilityBlockService
{
    private readonly ApplicationDbContext _db;

    public AvailabilityBlockService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AvailabilityBlock>?> GetBlocksAsync(string hostId, int accommodationId)
    {
        var accommodationExists = await HostOwnsAccommodationAsync(hostId, accommodationId);
        if (!accommodationExists)
        {
            return null;
        }

        return await _db.AvailabilityBlocks
            .AsNoTracking()
            .Where(block => block.AccommodationId == accommodationId)
            .OrderByDescending(block => block.StartDate)
            .ToListAsync();
    }

    public async Task<AvailabilityBlock?> CreateBlockAsync(string hostId, int accommodationId, CreateAvailabilityBlockDto dto)
    {
        var accommodationExists = await HostOwnsAccommodationAsync(hostId, accommodationId);
        if (!accommodationExists)
        {
            return null;
        }

        var startDate = dto.StartDate.Date;
        var endDate = dto.EndDate.Date;
        ValidateDateRange(startDate, endDate);

        await EnsureNoConfirmedBookingOverlapAsync(accommodationId, startDate, endDate);
        await CancelOverlappingPendingBookingsAsync(accommodationId, startDate, endDate);

        var block = new AvailabilityBlock
        {
            AccommodationId = accommodationId,
            StartDate = startDate,
            EndDate = endDate,
            Note = dto.Note,
            CreatedAt = DateTime.UtcNow
        };

        _db.AvailabilityBlocks.Add(block);
        await _db.SaveChangesAsync();

        return block;
    }

    public async Task<bool?> DeleteBlockAsync(string hostId, int accommodationId, int blockId)
    {
        var accommodationExists = await HostOwnsAccommodationAsync(hostId, accommodationId);
        if (!accommodationExists)
        {
            return null;
        }

        var block = await _db.AvailabilityBlocks
            .FirstOrDefaultAsync(existingBlock => existingBlock.Id == blockId && existingBlock.AccommodationId == accommodationId);

        if (block == null)
        {
            return false;
        }

        _db.AvailabilityBlocks.Remove(block);
        await _db.SaveChangesAsync();

        return true;
    }

    private async Task<bool> HostOwnsAccommodationAsync(string hostId, int accommodationId)
    {
        return await _db.Accommodations
            .AsNoTracking()
            .AnyAsync(accommodation => accommodation.Id == accommodationId && accommodation.HostId == hostId);
    }

    private static void ValidateDateRange(DateTime startDate, DateTime endDate)
    {
        if (endDate <= startDate)
        {
            throw new InvalidOperationException("End date must be after start date.");
        }
    }

    private async Task EnsureNoConfirmedBookingOverlapAsync(int accommodationId, DateTime startDate, DateTime endDate)
    {
        var today = DateTime.UtcNow.Date;
        var overlapsWithBookings = await _db.Bookings.AnyAsync(booking =>
            booking.AccommodationId == accommodationId &&
            booking.Status == BookingStatus.Confirmed &&
            booking.CheckOutDate > today &&
            startDate < booking.CheckOutDate &&
            endDate > booking.CheckInDate);

        if (overlapsWithBookings)
        {
            throw new InvalidOperationException("You cannot block dates that overlap with confirmed upcoming bookings.");
        }
    }

    private async Task CancelOverlappingPendingBookingsAsync(int accommodationId, DateTime startDate, DateTime endDate)
    {
        var overlappingPendingBookings = await _db.Bookings
            .Where(booking =>
                booking.AccommodationId == accommodationId &&
                booking.Status == BookingStatus.Pending &&
                startDate < booking.CheckOutDate &&
                endDate > booking.CheckInDate)
            .ToListAsync();

        foreach (var booking in overlappingPendingBookings)
        {
            booking.Status = BookingStatus.Cancelled;
        }
    }
}
