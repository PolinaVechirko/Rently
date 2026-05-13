using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Claims;
using System.Threading.Tasks;
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
        public async Task<ActionResult<IEnumerable<AccommodationDto>>> GetAll(
            [FromQuery] string? sortBy = null, 
            [FromQuery] int limit = 100, 
            [FromQuery] int skip = 0,
            [FromQuery] string? location = null,
            [FromQuery] string? type = null,
            [FromQuery] decimal? minPrice = null,
            [FromQuery] decimal? maxPrice = null,
            [FromQuery] int? rooms = null,
            [FromQuery] int? beds = null,
            [FromQuery] int? amenityId = null,
            [FromQuery] string? checkIn = null,
            [FromQuery] string? checkOut = null)
        {
            var parsedCheckIn = ParseDateOrNull(checkIn);
            var parsedCheckOut = ParseDateOrNull(checkOut);

            var result = await _service.GetAllAccommodationsAsync(
                sortBy, limit, skip, location, type, minPrice, maxPrice, rooms, beds, amenityId, parsedCheckIn, parsedCheckOut);
            return Ok(result);
        }

        [HttpGet("search")]
        public async Task<ActionResult<PagedResultDto<AccommodationDto>>> Search(
            [FromQuery] string? sortBy = null,
            [FromQuery] int limit = 48,
            [FromQuery] int skip = 0,
            [FromQuery] string? location = null,
            [FromQuery(Name = "types")] string? typesCsv = null,
            [FromQuery] decimal? minPrice = null,
            [FromQuery] decimal? maxPrice = null,
            [FromQuery] int? rooms = null,
            [FromQuery] int? beds = null,
            [FromQuery] int? guests = null,
            [FromQuery(Name = "amenities")] string? amenitiesCsv = null,
            [FromQuery] string? checkIn = null,
            [FromQuery] string? checkOut = null)
        {
            var parsedCheckIn = ParseDateOrNull(checkIn);
            var parsedCheckOut = ParseDateOrNull(checkOut);

            var result = await _service.SearchAccommodationsAsync(
                sortBy, limit, skip, location, typesCsv, minPrice, maxPrice, rooms, beds, guests, amenitiesCsv, parsedCheckIn, parsedCheckOut);
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

        private static DateTime? ParseDateOrNull(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;

            var v = value.Trim();
            var formats = new[] { "yyyy-MM-dd", "dd.MM.yyyy", "d.M.yyyy", "dd/MM/yyyy", "d/M/yyyy" };

            if (DateTime.TryParseExact(v, formats, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var exact))
            {
                return exact.Date;
            }

            if (DateTime.TryParse(v, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var parsed))
            {
                return parsed.Date;
            }

            return null;
        }
    }
}
