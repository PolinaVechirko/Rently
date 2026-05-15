using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rently.Api.Abstractions;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize] // All booking actions require authentication
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _service;
        private readonly ICurrentUserService _currentUser;

        public BookingsController(IBookingService service, ICurrentUserService currentUser)
        {
            _service = service;
            _currentUser = currentUser;
        }

        [HttpPost]
        public async Task<ActionResult<BookingDto>> Create([FromBody] CreateBookingDto dto, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.CreateBookingAsync(userId, dto, cancellationToken);
            return Ok(result);
        }

        [HttpGet("my-bookings")]
        public async Task<ActionResult<IEnumerable<BookingDto>>> GetMyBookings(CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var results = await _service.GetMyBookingsAsync(userId, cancellationToken);
            return Ok(results);
        }

        [HttpGet("host-bookings")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<IEnumerable<BookingDto>>> GetHostBookings([FromQuery] int? accommodationId = null, CancellationToken cancellationToken = default)
        {
            var userId = _currentUser.GetRequiredUserId();
            var results = await _service.GetHostBookingsAsync(userId, accommodationId, cancellationToken);
            return Ok(results);
        }

        [HttpPut("{id}/cancel")]
        public async Task<ActionResult<BookingDto>> Cancel(int id, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.CancelPendingBookingAsync(userId, id, cancellationToken);
            if (result == null) return NotFound();

            return Ok(result);
        }

        [HttpPut("{id}/confirm")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<BookingDto>> Confirm(int id, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.ConfirmPendingBookingAsync(userId, id, cancellationToken);
            if (result == null) return NotFound();

            return Ok(result);
        }

        [HttpPut("{id}/decline")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<BookingDto>> Decline(int id, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.DeclinePendingBookingAsync(userId, id, cancellationToken);
            if (result == null) return NotFound();

            return Ok(result);
        }
    }
}
