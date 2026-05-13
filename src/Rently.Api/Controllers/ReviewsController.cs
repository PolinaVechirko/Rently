using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Rently.Persistence;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Host,Both")]
    public class ReviewsController : ControllerBase
    {
        private readonly ApplicationDbContext _db;

        public ReviewsController(ApplicationDbContext db)
        {
            _db = db;
        }

        public record ReplyDto(string Reply);

        [HttpPut("{id}/reply")]
        public async Task<ActionResult> Reply(int id, [FromBody] ReplyDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var review = await _db.Reviews
                .Include(r => r.Accommodation)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (review == null) return NotFound();
            if (review.Accommodation == null || review.Accommodation.HostId != userId) return Forbid();

            review.HostReply = dto.Reply?.Trim();
            review.HostReplyCreatedAt = string.IsNullOrWhiteSpace(review.HostReply) ? null : DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { id = review.Id, hostReply = review.HostReply, hostReplyCreatedAt = review.HostReplyCreatedAt });
        }
    }
}