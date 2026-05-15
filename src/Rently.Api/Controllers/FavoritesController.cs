using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rently.Api.Abstractions;
using Rently.Application.Interfaces;
using Rently.Application.DTOs;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FavoritesController : ControllerBase
    {
        private readonly IFavoriteService _service;
        private readonly ICurrentUserService _currentUser;

        public FavoritesController(IFavoriteService service, ICurrentUserService currentUser)
        {
            _service = service;
            _currentUser = currentUser;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FavoriteItemDto>>> GetMyFavorites(CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var results = await _service.GetFavoritesAsync(userId, cancellationToken);
            return Ok(results);
        }

        [HttpGet("{accommodationId}")]
        public async Task<ActionResult<FavoriteStatusDto>> IsFavorited(int accommodationId, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.GetFavoriteStatusAsync(userId, accommodationId, cancellationToken);
            return Ok(result);
        }

        [HttpPost("{accommodationId}")]
        public async Task<ActionResult> AddFavorite(int accommodationId, [FromQuery] string type = "Guest", CancellationToken cancellationToken = default)
        {
            var userId = _currentUser.GetRequiredUserId();
            var result = await _service.AddFavoriteAsync(userId, accommodationId, type, cancellationToken);
            if (result == null)
            {
                return Conflict(new { message = "Already favorited" });
            }

            return Ok(result);
        }

        [HttpDelete("{accommodationId}")]
        public async Task<ActionResult> RemoveFavorite(int accommodationId, [FromQuery] string? type = null, CancellationToken cancellationToken = default)
        {
            var userId = _currentUser.GetRequiredUserId();
            var removed = await _service.RemoveFavoriteAsync(userId, accommodationId, type, cancellationToken);
            if (!removed)
            {
                return NotFound();
            }

            return NoContent();
        }
    }
}
