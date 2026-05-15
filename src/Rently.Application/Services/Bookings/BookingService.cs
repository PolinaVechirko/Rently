using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Application.Mappers;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Bookings;

public class BookingService : IBookingService
{
    private readonly ApplicationDbContext _context;
    private readonly BookingAvailabilityService _availabilityService;

    public BookingService(
        ApplicationDbContext context,
        BookingAvailabilityService availabilityService)
    {
        _context = context;
        _availabilityService = availabilityService;
    }

    public async Task<BookingDto> CreateBookingAsync(string guestId, CreateBookingDto dto, CancellationToken cancellationToken = default)
    {
        var (normalizedCheckIn, normalizedCheckOut) =
            BookingValidation.NormalizeDates(dto.CheckInDate, dto.CheckOutDate);

        await _availabilityService.EnsureAccommodationExistsAsync(dto.AccommodationId, cancellationToken);
        await _availabilityService.EnsureAvailableAsync(dto.AccommodationId, normalizedCheckIn, normalizedCheckOut, cancellationToken: cancellationToken);

        var booking = new Booking
        {
            AccommodationId = dto.AccommodationId,
            GuestId = guestId,
            CheckInDate = normalizedCheckIn,
            CheckOutDate = normalizedCheckOut,
            Status = BookingStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync(cancellationToken);

        return BookingMapper.ToDto(booking);
    }

    public async Task<IEnumerable<BookingDto>> GetMyBookingsAsync(string guestId, CancellationToken cancellationToken = default)
    {
        var bookings = await BuildBookingWithAccommodationQuery()
            .Where(booking => booking.GuestId == guestId)
            .ToListAsync(cancellationToken);

        return bookings.Select(booking => BookingMapper.ToDto(booking));
    }

    public async Task<IEnumerable<BookingDto>> GetHostBookingsAsync(string hostId, int? accommodationId = null, CancellationToken cancellationToken = default)
    {
        var query = BuildBookingWithAccommodationQuery()
            .Where(booking => booking.Accommodation != null && booking.Accommodation.HostId == hostId);

        if (accommodationId.HasValue)
        {
            query = query.Where(booking => booking.AccommodationId == accommodationId.Value);
        }

        var bookings = await query
            .OrderBy(booking => booking.CheckInDate)
            .ToListAsync(cancellationToken);

        var guestIds = bookings.Select(booking => booking.GuestId).Distinct().ToList();
        var guests = await _context.Users
            .Where(user => guestIds.Contains(user.Id))
            .ToDictionaryAsync(user => user.Id, user => user, cancellationToken);

        return bookings.Select(booking => BookingMapper.ToDto(
            booking,
            guests.TryGetValue(booking.GuestId, out var guest) ? guest : null));
    }

    public async Task<BookingDto?> CancelPendingBookingAsync(string guestId, int bookingId, CancellationToken cancellationToken = default)
    {
        var booking = await BuildBookingWithAccommodationQuery()
            .FirstOrDefaultAsync(booking => booking.Id == bookingId && booking.GuestId == guestId, cancellationToken);

        if (booking == null) return null;
        BookingValidation.EnsurePendingStatus(booking, "Only pending bookings can be cancelled.");

        booking.Status = BookingStatus.Cancelled;
        await _context.SaveChangesAsync(cancellationToken);

        return BookingMapper.ToDto(booking);
    }

    public async Task<BookingDto?> ConfirmPendingBookingAsync(string hostId, int bookingId, CancellationToken cancellationToken = default)
    {
        var booking = await BuildBookingWithAccommodationQuery()
            .FirstOrDefaultAsync(booking =>
                booking.Id == bookingId &&
                booking.Accommodation != null &&
                booking.Accommodation.HostId == hostId, cancellationToken);

        if (booking == null) return null;
        BookingValidation.EnsurePendingStatus(booking, "Only pending bookings can be accepted.");
        await _availabilityService.EnsureAvailableAsync(
            booking.AccommodationId,
            booking.CheckInDate,
            booking.CheckOutDate,
            booking.Id,
            cancellationToken);

        booking.Status = BookingStatus.Confirmed;
        await _context.SaveChangesAsync(cancellationToken);

        return BookingMapper.ToDto(booking);
    }

    public async Task<BookingDto?> DeclinePendingBookingAsync(string hostId, int bookingId, CancellationToken cancellationToken = default)
    {
        var booking = await BuildBookingWithAccommodationQuery()
            .FirstOrDefaultAsync(booking =>
                booking.Id == bookingId &&
                booking.Accommodation != null &&
                booking.Accommodation.HostId == hostId, cancellationToken);

        if (booking == null) return null;
        BookingValidation.EnsurePendingStatus(booking, "Only pending bookings can be declined.");

        booking.Status = BookingStatus.Cancelled;
        await _context.SaveChangesAsync(cancellationToken);

        return BookingMapper.ToDto(booking);
    }

    private IQueryable<Booking> BuildBookingWithAccommodationQuery()
    {
        return _context.Bookings
            .Include(booking => booking.Accommodation!)
                .ThenInclude(accommodation => accommodation.Address)
            .Include(booking => booking.Accommodation!)
                .ThenInclude(accommodation => accommodation.Photos);
    }
}
