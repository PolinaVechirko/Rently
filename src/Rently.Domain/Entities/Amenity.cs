using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Rently.Domain.Entities
{
    public class Amenity
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;

        // Navigation
        public ICollection<AccommodationAmenity>? AccommodationAmenities { get; set; }
    }
}
