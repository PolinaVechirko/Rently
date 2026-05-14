using System.Collections.Generic;
using Rently.Domain.Entities;

namespace Rently.Application.DTOs
{
    public class FavoriteItemDto
    {
        public AccommodationDto Accommodation { get; set; } = new();
        public List<FavoriteType> Types { get; set; } = new();
        public bool IsGuestFavorite { get; set; }
        public bool IsHostFavorite { get; set; }
    }
}
