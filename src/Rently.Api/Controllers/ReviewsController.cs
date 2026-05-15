using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rently.Api.Abstractions;
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
        private readonly ICurrentUserService _currentUser;

        public ReviewsController(IReviewService service, ICurrentUserService currentUser)
        {
            _service = service;
            _currentUser = currentUser;
        }

        [HttpGet("eligibility")]
        public async Task<ActionResult<ReviewEligibilityDto>> GetEligibility([FromQuery] int accommodationId, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.GetEligibilityAsync(userId, accommodationId, cancellationToken);
            return Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<ReviewDto>> CreateOrUpdate([FromBody] CreateReviewDto dto, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();

            try
            {
                var result = await _service.UpsertReviewAsync(userId, dto, cancellationToken);
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
        public async Task<ActionResult<ReviewReplyResultDto>> Reply(int id, [FromBody] ReviewReplyDto dto, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();

            try
            {
                var result = await _service.ReplyAsync(userId, id, dto, cancellationToken);
                if (result == null) return NotFound();

                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }
    }
}
