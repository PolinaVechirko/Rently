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

            if (dto.EndDate <= dto.StartDate) return BadRequest(new { message = "End date must be after start date." });

            var block = new AvailabilityBlock
            {
                AccommodationId = accommodationId,
                StartDate = dto.StartDate.Date,
                EndDate = dto.EndDate.Date,
                Note = dto.Note,
                CreatedAt = DateTime.UtcNow
            };

            _db.AvailabilityBlocks.Add(block);
            await _db.SaveChangesAsync();
            return Ok(block);
        }
    }
}