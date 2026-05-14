using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Threading.Tasks;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _service;

        public ReviewsController(IReviewService service)
        {
            _service = service;
        }

        [HttpGet("eligibility")]
        public async Task<ActionResult<ReviewEligibilityDto>> GetEligibility([FromQuery] int accommodationId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _service.GetEligibilityAsync(userId, accommodationId);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<ReviewDto>> CreateOrUpdate([FromBody] CreateReviewDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            try
            {
                var result = await _service.UpsertReviewAsync(userId, dto);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }

        [HttpPut("{id}/reply")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<ReviewReplyResultDto>> Reply(int id, [FromBody] ReviewReplyDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            try
            {
                var result = await _service.ReplyAsync(userId, id, dto);
                if (result == null) return NotFound();

                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }
    }
}
