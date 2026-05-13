using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
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
            // Verify accommodation exists
            var accommodation = await _context.Accommodations.FindAsync(dto.AccommodationId);
            if (accommodation == null) throw new ArgumentException("Accommodation not found.");

            // Check for overlaps (simplified)
            bool overlaps = await _context.Bookings.AnyAsync(b => 
                b.AccommodationId == dto.AccommodationId && 
                b.Status != BookingStatus.Cancelled &&
                (dto.CheckInDate < b.CheckOutDate && dto.CheckOutDate > b.CheckInDate));

            if (overlaps) throw new InvalidOperationException("Accommodation is not available for these dates.");

            var blocked = await _context.AvailabilityBlocks.AnyAsync(b =>
                b.AccommodationId == dto.AccommodationId &&
                dto.CheckInDate < b.EndDate &&
                dto.CheckOutDate > b.StartDate);

            if (blocked) throw new InvalidOperationException("Accommodation is blocked for these dates.");

            var booking = new Booking
            {
                AccommodationId = dto.AccommodationId,
                GuestId = guestId,
                CheckInDate = dto.CheckInDate,
                CheckOutDate = dto.CheckOutDate,
                Status = BookingStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();

            return MapToDto(booking);
        }

        public async Task<IEnumerable<BookingDto>> GetMyBookingsAsync(string guestId)
        {
            var bookings = await _context.Bookings
                .Include(b => b.Accommodation)
                    .ThenInclude(a => a.Address)
                .Include(b => b.Accommodation)
                    .ThenInclude(a => a.Photos)
                .Where(b => b.GuestId == guestId)
                .ToListAsync();

            return bookings.Select(booking => MapToDto(booking));
        }

        public async Task<IEnumerable<BookingDto>> GetHostBookingsAsync(string hostId, int? accommodationId = null)
        {
            var query = _context.Bookings
                .Include(b => b.Accommodation)
                    .ThenInclude(a => a.Address)
                .Include(b => b.Accommodation)
                    .ThenInclude(a => a.Photos)
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

            return bookings.Select(booking => MapToDto(
                booking,
                guests.TryGetValue(booking.GuestId, out var guest) ? guest : null));
        }

        private BookingDto MapToDto(Booking entity, ApplicationUser? guest = null)
        {
            return new BookingDto
            {
                Id = entity.Id,
                AccommodationId = entity.AccommodationId,
                GuestId = entity.GuestId,
                CheckInDate = entity.CheckInDate,
                CheckOutDate = entity.CheckOutDate,
                Status = entity.Status,
                CreatedAt = entity.CreatedAt,
                AccommodationTitle = entity.Accommodation?.Description,
                AccommodationType = entity.Accommodation?.PropertyType.ToString(),
                AccommodationCountry = entity.Accommodation?.Address?.Country,
                AccommodationCity = entity.Accommodation?.Address?.City,
                AccommodationPhotoUrl = entity.Accommodation?.Photos?.FirstOrDefault()?.Url,
                PricePerNight = entity.Accommodation?.PricePerNight,
                GuestName = guest?.FullName,
                GuestAvatarUrl = guest?.ProfilePhotoUrl
            };
        }
    }
}
