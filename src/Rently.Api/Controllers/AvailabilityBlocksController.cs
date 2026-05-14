using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rently.Persistence;
using Rently.Domain.Entities;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Host,Both")]
    public class AvailabilityBlocksController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public AvailabilityBlocksController(ApplicationDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<ActionResult> Get([FromQuery] int accommodationId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var accommodation = await _db.Accommodations.AsNoTracking().FirstOrDefaultAsync(a => a.Id == accommodationId && a.HostId == userId);
            if (accommodation == null) return NotFound();

            var blocks = await _db.AvailabilityBlocks.AsNoTracking()
                .Where(b => b.AccommodationId == accommodationId)
                .OrderByDescending(b => b.StartDate)
                .ToListAsync();

            return Ok(blocks);
        }

        public record CreateAvailabilityBlockDto(DateTime StartDate, DateTime EndDate, string? Note);

        [HttpPost]
        public async Task<ActionResult> Create([FromBody] CreateAvailabilityBlockDto dto, [FromQuery] int accommodationId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var accommodation = await _db.Accommodations.FirstOrDefaultAsync(a => a.Id == accommodationId && a.HostId == userId);
            if (accommodation == null) return NotFound();

            var startDate = dto.StartDate.Date;
            var endDate = dto.EndDate.Date;
            if (endDate <= startDate) return BadRequest(new { message = "End date must be after start date." });

            var today = DateTime.UtcNow.Date;

            var overlapsWithBookings = await _db.Bookings.AnyAsync(b =>
                b.AccommodationId == accommodationId &&
                b.Status == BookingStatus.Confirmed &&
                b.CheckOutDate > today &&
                startDate < b.CheckOutDate &&
                endDate > b.CheckInDate);

            if (overlapsWithBookings)
            {
                return BadRequest(new { message = "You cannot block dates that overlap with confirmed upcoming bookings." });
            }

            var overlappingPendingBookings = await _db.Bookings
                .Where(b =>
                    b.AccommodationId == accommodationId &&
                    b.Status == BookingStatus.Pending &&
                    startDate < b.CheckOutDate &&
                    endDate > b.CheckInDate)
                .ToListAsync();

            foreach (var booking in overlappingPendingBookings)
            {
                booking.Status = BookingStatus.Cancelled;
            }

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
            return Ok(block);
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(int id, [FromQuery] int accommodationId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var accommodation = await _db.Accommodations.AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == accommodationId && a.HostId == userId);
            if (accommodation == null) return NotFound();

            var block = await _db.AvailabilityBlocks
                .FirstOrDefaultAsync(b => b.Id == id && b.AccommodationId == accommodationId);
            if (block == null) return NotFound();

            _db.AvailabilityBlocks.Remove(block);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
