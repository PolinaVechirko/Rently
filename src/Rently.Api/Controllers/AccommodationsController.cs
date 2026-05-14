using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
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

        public AccommodationsController(IAccommodationService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AccommodationDto>>> GetAll([FromQuery] GetAccommodationsRequest request)
        {
            var result = await _service.GetAllAccommodationsAsync(request.ToQueryDto());
            return Ok(result);
        }

        [HttpGet("search")]
        public async Task<ActionResult<PagedResultDto<AccommodationDto>>> Search([FromQuery] SearchAccommodationsRequest request)
        {
            var result = await _service.SearchAccommodationsAsync(request.ToQueryDto());
            return Ok(result);
        }

        [HttpGet("homepage/highest-rated")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
        public async Task<ActionResult<IReadOnlyList<AccommodationDto>>> GetHomepageHighestRated([FromQuery] int count = 16)
        {
            var result = await _service.GetHomepageHighestRatedAsync(count);
            return Ok(result);
        }

        [HttpGet("homepage/most-visited")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
        public async Task<ActionResult<IReadOnlyList<AccommodationDto>>> GetHomepageMostVisited([FromQuery] int count = 16, [FromQuery] int skip = 0)
        {
            var result = await _service.GetHomepageMostVisitedAsync(count, skip);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AccommodationDto>> GetById(int id)
        {
            var result = await _service.GetAccommodationByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<AccommodationDto>> Create([FromBody] CreateAccommodationDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _service.CreateAccommodationAsync(userId, dto);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult> Delete(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var success = await _service.DeleteAccommodationAsync(id, userId);
            if (!success) return NotFound("Accommodation not found or you are not the owner.");

            return NoContent();
        }

        [HttpGet("locations")]
        public async Task<ActionResult<IEnumerable<string>>> GetLocations()
        {
            var result = await _service.GetUniqueLocationsAsync();
            return Ok(result);
        }

        [HttpGet("my")]
        [Authorize]
        public async Task<ActionResult<IEnumerable<AccommodationDto>>> GetMyAccommodations()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _service.GetHostAccommodationsAsync(userId);
            return Ok(result);
        }

        [HttpPut("{id}")]
        [Authorize]
        public async Task<ActionResult<AccommodationDto>> Update(int id, [FromBody] UpdateAccommodationDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _service.UpdateAccommodationAsync(id, userId, dto);
            if (result == null) return NotFound("Accommodation not found or you are not the owner.");

            return Ok(result);
        }
    }
}
