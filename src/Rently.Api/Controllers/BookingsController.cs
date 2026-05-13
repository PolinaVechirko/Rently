using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
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

        public BookingsController(IBookingService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<ActionResult<BookingDto>> Create([FromBody] CreateBookingDto dto)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (userId == null) return Unauthorized();

                var result = await _service.CreateBookingAsync(userId, dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("my-bookings")]
        public async Task<ActionResult<IEnumerable<BookingDto>>> GetMyBookings()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var results = await _service.GetMyBookingsAsync(userId);
            return Ok(results);
        }

        [HttpGet("host-bookings")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<IEnumerable<BookingDto>>> GetHostBookings([FromQuery] int? accommodationId = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var results = await _service.GetHostBookingsAsync(userId, accommodationId);
            return Ok(results);
        }
    }
}
