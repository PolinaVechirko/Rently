using System;

namespace Rently.Domain.Entities
{
    public enum FavoriteType
    {
        Guest = 0,
        Host = 1
    }

    public class Favorite
    {
        public string UserId { get; set; } = string.Empty;

        public int AccommodationId { get; set; }
        public Accommodation? Accommodation { get; set; }

        public FavoriteType Type { get; set; } = FavoriteType.Guest;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
