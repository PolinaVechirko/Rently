using System.Collections.Generic;
using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        public FavoritesController(IFavoriteService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<FavoriteItemDto>>> GetMyFavorites()
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var results = await _service.GetFavoritesAsync(userId);
            return Ok(results);
        }

        [HttpGet("{accommodationId}")]
        public async Task<ActionResult<FavoriteStatusDto>> IsFavorited(int accommodationId)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _service.GetFavoriteStatusAsync(userId, accommodationId);
            return Ok(result);
        }

        [HttpPost("{accommodationId}")]
        public async Task<ActionResult> AddFavorite(int accommodationId, [FromQuery] string type = "Guest")
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null) return Unauthorized();

                var result = await _service.AddFavoriteAsync(userId, accommodationId, type);
                if (result == null)
                {
                    return Conflict(new { message = "Already favorited" });
                }

                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpDelete("{accommodationId}")]
        public async Task<ActionResult> RemoveFavorite(int accommodationId, [FromQuery] string? type = null)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == null) return Unauthorized();

                var removed = await _service.RemoveFavoriteAsync(userId, accommodationId, type);
                if (!removed)
                {
                    return NotFound();
                }

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirstValue(ClaimTypes.NameIdentifier);
        }
    }
}
