using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Rently.Api.Mappers;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Api.Services
{
    public class BookingService : IBookingService
    {
        private readonly ApplicationDbContext _context;

        public BookingService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<BookingDto> CreateBookingAsync(string guestId, CreateBookingDto dto)
        {
            var normalizedCheckIn = dto.CheckInDate.Date;
            var normalizedCheckOut = dto.CheckOutDate.Date;
            ValidateBookingDates(normalizedCheckIn, normalizedCheckOut);

            await EnsureAccommodationExistsAsync(dto.AccommodationId);
            await EnsureAccommodationAvailabilityAsync(dto.AccommodationId, normalizedCheckIn, normalizedCheckOut);

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
            await _context.SaveChangesAsync();

            return BookingMapper.ToDto(booking);
        }

        public async Task<IEnumerable<BookingDto>> GetMyBookingsAsync(string guestId)
        {
            var bookings = await BuildBookingWithAccommodationQuery()
                .Where(b => b.GuestId == guestId)
                .ToListAsync();

            return bookings.Select(booking => BookingMapper.ToDto(booking));
        }

        public async Task<IEnumerable<BookingDto>> GetHostBookingsAsync(string hostId, int? accommodationId = null)
        {
            var query = BuildBookingWithAccommodationQuery()
                .Where(b => b.Accommodation != null && b.Accommodation.HostId == hostId);

            if (accommodationId.HasValue)
            {
                query = query.Where(b => b.AccommodationId == accommodationId.Value);
            }

            var bookings = await query
                .OrderBy(b => b.CheckInDate)
                .ToListAsync();

            var guestIds = bookings.Select(b => b.GuestId).Distinct().ToList();
            var guests = await _context.Users
                .Where(u => guestIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u);

            return bookings.Select(booking => BookingMapper.ToDto(
                booking,
                guests.TryGetValue(booking.GuestId, out var guest) ? guest : null));
        }

        public async Task<BookingDto?> CancelPendingBookingAsync(string guestId, int bookingId)
        {
            var booking = await BuildBookingWithAccommodationQuery()
                .FirstOrDefaultAsync(b => b.Id == bookingId && b.GuestId == guestId);

            if (booking == null) return null;
            EnsurePendingStatus(booking, "Only pending bookings can be cancelled.");

            booking.Status = BookingStatus.Cancelled;
            await _context.SaveChangesAsync();

            return BookingMapper.ToDto(booking);
        }

        public async Task<BookingDto?> ConfirmPendingBookingAsync(string hostId, int bookingId)
        {
            var booking = await BuildBookingWithAccommodationQuery()
                .FirstOrDefaultAsync(b =>
                    b.Id == bookingId &&
                    b.Accommodation != null &&
                    b.Accommodation.HostId == hostId);

            if (booking == null) return null;
            EnsurePendingStatus(booking, "Only pending bookings can be accepted.");
            await EnsureAccommodationAvailabilityAsync(
                booking.AccommodationId,
                booking.CheckInDate,
                booking.CheckOutDate,
                booking.Id);

            booking.Status = BookingStatus.Confirmed;
            await _context.SaveChangesAsync();

            return BookingMapper.ToDto(booking);
        }

        public async Task<BookingDto?> DeclinePendingBookingAsync(string hostId, int bookingId)
        {
            var booking = await BuildBookingWithAccommodationQuery()
                .FirstOrDefaultAsync(b =>
                    b.Id == bookingId &&
                    b.Accommodation != null &&
                    b.Accommodation.HostId == hostId);

            if (booking == null) return null;
            EnsurePendingStatus(booking, "Only pending bookings can be declined.");

            booking.Status = BookingStatus.Cancelled;
            await _context.SaveChangesAsync();

            return BookingMapper.ToDto(booking);
        }

        private IQueryable<Booking> BuildBookingWithAccommodationQuery()
        {
            return _context.Bookings
                .Include(b => b.Accommodation!)
                    .ThenInclude(a => a.Address)
                .Include(b => b.Accommodation!)
                    .ThenInclude(a => a.Photos);
        }

        private async Task EnsureAccommodationExistsAsync(int accommodationId)
        {
            var exists = await _context.Accommodations.AnyAsync(a => a.Id == accommodationId);
            if (!exists)
            {
                throw new ArgumentException("Accommodation not found.");
            }
        }

        private static void ValidateBookingDates(DateTime checkIn, DateTime checkOut)
        {
            if (checkOut <= checkIn)
            {
                throw new InvalidOperationException("Check-out date must be after check-in date.");
            }
        }

        private static void EnsurePendingStatus(Booking booking, string errorMessage)
        {
            if (booking.Status != BookingStatus.Pending)
            {
                throw new InvalidOperationException(errorMessage);
            }
        }

        private async Task EnsureAccommodationAvailabilityAsync(
            int accommodationId,
            DateTime checkIn,
            DateTime checkOut,
            int? ignoredBookingId = null)
        {
            var hasOverlappingBooking = await _context.Bookings.AnyAsync(b =>
                b.AccommodationId == accommodationId &&
                (!ignoredBookingId.HasValue || b.Id != ignoredBookingId.Value) &&
                b.Status != BookingStatus.Cancelled &&
                checkIn < b.CheckOutDate &&
                checkOut > b.CheckInDate);

            if (hasOverlappingBooking)
            {
                throw new InvalidOperationException("Accommodation is not available for these dates.");
            }

            var hasAvailabilityBlock = await _context.AvailabilityBlocks.AnyAsync(block =>
                block.AccommodationId == accommodationId &&
                checkIn < block.EndDate &&
                checkOut > block.StartDate);

            if (hasAvailabilityBlock)
            {
                throw new InvalidOperationException("Accommodation is blocked for these dates.");
            }
        }
    }
}
