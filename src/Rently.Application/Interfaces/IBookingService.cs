using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IBookingService
    {
        Task<BookingDto> CreateBookingAsync(string guestId, CreateBookingDto dto, CancellationToken cancellationToken = default);
        Task<IEnumerable<BookingDto>> GetMyBookingsAsync(string guestId, CancellationToken cancellationToken = default);
        Task<IEnumerable<BookingDto>> GetHostBookingsAsync(string hostId, int? accommodationId = null, CancellationToken cancellationToken = default);
        Task<BookingDto?> CancelPendingBookingAsync(string guestId, int bookingId, CancellationToken cancellationToken = default);
        Task<BookingDto?> ConfirmPendingBookingAsync(string hostId, int bookingId, CancellationToken cancellationToken = default);
        Task<BookingDto?> DeclinePendingBookingAsync(string hostId, int bookingId, CancellationToken cancellationToken = default);
    }
}
