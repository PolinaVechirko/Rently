using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rently.Api.Abstractions;
using Rently.Api.Models.Accommodations;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AccommodationsController : ControllerBase
    {
        private readonly IAccommodationService _service;
        private readonly ICurrentUserService _currentUser;

        public AccommodationsController(IAccommodationService service, ICurrentUserService currentUser)
        {
            _service = service;
            _currentUser = currentUser;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AccommodationDto>>> GetAll([FromQuery] GetAccommodationsRequest request, CancellationToken cancellationToken)
        {
            var result = await _service.GetAllAccommodationsAsync(request.ToQueryDto(), cancellationToken);
            return Ok(result);
        }

        [HttpGet("search")]
        public async Task<ActionResult<PagedResultDto<AccommodationDto>>> Search([FromQuery] SearchAccommodationsRequest request, CancellationToken cancellationToken)
        {
            var result = await _service.SearchAccommodationsAsync(request.ToQueryDto(), cancellationToken);
            return Ok(result);
        }

        [HttpGet("homepage/highest-rated")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
        public async Task<ActionResult<IReadOnlyList<AccommodationDto>>> GetHomepageHighestRated([FromQuery] int count = 16, CancellationToken cancellationToken = default)
        {
            var result = await _service.GetHomepageHighestRatedAsync(count, cancellationToken);
            return Ok(result);
        }

        [HttpGet("homepage/most-visited")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
        public async Task<ActionResult<IReadOnlyList<AccommodationDto>>> GetHomepageMostVisited([FromQuery] int count = 16, [FromQuery] int skip = 0, CancellationToken cancellationToken = default)
        {
            var result = await _service.GetHomepageMostVisitedAsync(count, skip, cancellationToken);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AccommodationDto>> GetById(int id, CancellationToken cancellationToken)
        {
            var result = await _service.GetAccommodationByIdAsync(id, cancellationToken);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<AccommodationDto>> Create([FromBody] CreateAccommodationDto dto, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.CreateAccommodationAsync(userId, dto, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult> Delete(int id, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var success = await _service.DeleteAccommodationAsync(id, userId, cancellationToken);
            if (!success) return NotFound("Accommodation not found or you are not the owner.");

            return NoContent();
        }

        [HttpGet("locations")]
        public async Task<ActionResult<IEnumerable<string>>> GetLocations(CancellationToken cancellationToken)
        {
            var result = await _service.GetUniqueLocationsAsync(cancellationToken);
            return Ok(result);
        }

        [HttpGet("my")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<AccommodationDto>>> GetMyAccommodations(CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.GetHostAccommodationsAsync(userId, cancellationToken);
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<ActionResult<AccommodationDto>> Update(int id, [FromBody] UpdateAccommodationDto dto, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.UpdateAccommodationAsync(id, userId, dto, cancellationToken);
            if (result == null) return NotFound("Accommodation not found or you are not the owner.");

            return Ok(result);
        }
    }
}
