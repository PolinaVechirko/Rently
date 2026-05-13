using System.Collections.Generic;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IBookingService
    {
        Task<BookingDto> CreateBookingAsync(string guestId, CreateBookingDto dto);
        Task<IEnumerable<BookingDto>> GetMyBookingsAsync(string guestId);
        Task<IEnumerable<BookingDto>> GetHostBookingsAsync(string hostId, int? accommodationId = null);
        Task<BookingDto?> CancelPendingBookingAsync(string guestId, int bookingId);
        Task<BookingDto?> ConfirmPendingBookingAsync(string hostId, int bookingId);
        Task<BookingDto?> DeclinePendingBookingAsync(string hostId, int bookingId);
    }
}
