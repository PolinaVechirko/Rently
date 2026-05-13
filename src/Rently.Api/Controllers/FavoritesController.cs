using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class FavoritesController : ControllerBase
    {
        private readonly ApplicationDbContext _db;
        private readonly IAccommodationService _accommodationService;

        public FavoritesController(ApplicationDbContext db, IAccommodationService accommodationService)
        {
            _db = db;
            _accommodationService = accommodationService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetMyFavorites()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var favs = _db.Favorites.Where(f => f.UserId == userId).ToList();
            var grouped = favs.GroupBy(f => f.AccommodationId).ToList();
            
            var results = new List<object>();
            foreach (var group in grouped)
            {
                var dto = await _accommodationService.GetAccommodationByIdAsync(group.Key);
                if (dto != null)
                {
                    var types = group.Select(f => f.Type).ToList();
                    results.Add(new
                    {
                        accommodation = dto,
                        types = types,
                        isGuestFavorite = types.Contains(FavoriteType.Guest),
                        isHostFavorite = types.Contains(FavoriteType.Host)
                    });
                }
            }

            return Ok(results);
        }

        [HttpGet("{accommodationId}")]
        public ActionResult<object> IsFavorited(int accommodationId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var guestFav = _db.Favorites.FirstOrDefault(f => f.UserId == userId && f.AccommodationId == accommodationId && f.Type == FavoriteType.Guest);
            var hostFav = _db.Favorites.FirstOrDefault(f => f.UserId == userId && f.AccommodationId == accommodationId && f.Type == FavoriteType.Host);

            return Ok(new { 
                guestFavorited = guestFav != null,
                hostFavorited = hostFav != null
            });
        }

        [HttpPost("{accommodationId}")]
        public async Task<ActionResult> AddFavorite(int accommodationId, [FromQuery] string type = "Guest")
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            // Parse type parameter
            FavoriteType favoriteType = FavoriteType.Guest;
            if (Enum.TryParse<FavoriteType>(type, ignoreCase: true, out var parsedType))
            {
                favoriteType = parsedType;
            }

            var exists = _db.Favorites.FirstOrDefault(f => 
                f.UserId == userId && 
                f.AccommodationId == accommodationId && 
                f.Type == favoriteType);
            
            if (exists != null) return Conflict(new { message = "Already favorited" });

            _db.Favorites.Add(new Favorite { 
                UserId = userId, 
                AccommodationId = accommodationId,
                Type = favoriteType
            });
            await _db.SaveChangesAsync();
            return Ok(new { type = favoriteType });
        }

        [HttpDelete("{accommodationId}")]
        public async Task<ActionResult> RemoveFavorite(int accommodationId, [FromQuery] string? type = null)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            FavoriteType? favoriteType = null;
            if (!string.IsNullOrEmpty(type) && Enum.TryParse<FavoriteType>(type, ignoreCase: true, out var parsedType))
            {
                favoriteType = parsedType;
            }

            if (favoriteType == null)
            {
                // Remove both types if type not specified
                var favs = _db.Favorites.Where(f => 
                    f.UserId == userId && 
                    f.AccommodationId == accommodationId);
                
                if (!favs.Any()) return NotFound();
                
                _db.Favorites.RemoveRange(favs);
            }
            else
            {
                var fav = _db.Favorites.FirstOrDefault(f => 
                    f.UserId == userId && 
                    f.AccommodationId == accommodationId && 
                    f.Type == favoriteType);
                
                if (fav == null) return NotFound();
                
                _db.Favorites.Remove(fav);
            }

            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
