using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Rently.Domain.Entities
{
    public class Address
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string Country { get; set; } = string.Empty;

        [Required]
        public string City { get; set; } = string.Empty;

        public string? PostalCode { get; set; }
        public string? Street { get; set; }
        public string? BuildingNumber { get; set; }

        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        // Navigation
        public ICollection<Accommodation>? Accommodations { get; set; }
    }
}
