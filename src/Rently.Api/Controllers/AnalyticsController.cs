using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Collections.Generic;
using System.Threading.Tasks;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _service;

        public AnalyticsController(IAnalyticsService service)
        {
            _service = service;
        }

        [HttpGet("top-amenities")]
        public async Task<ActionResult<IEnumerable<AmenityPopularityDto>>> GetTopAmenities([FromQuery] int count = 15)
        {
            var result = await _service.GetTopAmenitiesAsync(count);
            return Ok(result);
        }

        [HttpGet("city-stats")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
        public async Task<ActionResult<IEnumerable<CityStatsDto>>> GetCityStats([FromQuery] int count = 10)
        {
            var result = await _service.GetCityStatsAsync(count);
            return Ok(result);
        }

        [HttpGet("host-summary")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<HostDashboardStatsDto>> GetHostSummary()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var result = await _service.GetHostDashboardStatsAsync(userId);
            return Ok(result);
        }
    }
}
