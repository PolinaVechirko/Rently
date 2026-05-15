using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rently.Api.Abstractions;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AnalyticsController : ControllerBase
    {
        private readonly IAnalyticsService _service;
        private readonly ICurrentUserService _currentUser;

        public AnalyticsController(IAnalyticsService service, ICurrentUserService currentUser)
        {
            _service = service;
            _currentUser = currentUser;
        }

        [HttpGet("top-amenities")]
        public async Task<ActionResult<IEnumerable<AmenityPopularityDto>>> GetTopAmenities([FromQuery] int count = 15, CancellationToken cancellationToken = default)
        {
            var result = await _service.GetTopAmenitiesAsync(count, cancellationToken);
            return Ok(result);
        }

        [HttpGet("city-stats")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
        public async Task<ActionResult<IEnumerable<CityStatsDto>>> GetCityStats([FromQuery] int count = 10, CancellationToken cancellationToken = default)
        {
            var result = await _service.GetCityStatsAsync(count, cancellationToken);
            return Ok(result);
        }

        [HttpGet("host-summary")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<HostDashboardStatsDto>> GetHostSummary(CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.GetHostDashboardStatsAsync(userId, cancellationToken);
            return Ok(result);
        }
    }
}
