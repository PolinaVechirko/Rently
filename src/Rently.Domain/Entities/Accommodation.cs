using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Rently.Domain.Entities
{
    public class Accommodation
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string HostId { get; set; } = string.Empty;

        [Required]
        public int AddressId { get; set; }
        public Address? Address { get; set; }

        [Required]
        public PropertyType PropertyType { get; set; }

        [Required]
        [Column(TypeName = "decimal(18,2)")]
        public decimal PricePerNight { get; set; }

        public int? RoomsCount { get; set; }
        public int? BedsCount { get; set; }

        public string? Description { get; set; }
        public string Title { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Required]
        public bool IsActive { get; set; } = true;

        // Navigation properties
        public ICollection<AccommodationAmenity>? AccommodationAmenities { get; set; }
        public ICollection<Photo>? Photos { get; set; }
        public ICollection<Booking>? Bookings { get; set; }
        public ICollection<Review>? Reviews { get; set; }
        public ICollection<Favorite>? FavoritedBy { get; set; }
    }
}
