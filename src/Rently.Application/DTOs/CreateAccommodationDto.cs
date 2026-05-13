using System.Collections.Generic;
using Rently.Domain.Entities;

namespace Rently.Application.DTOs
{
    public class CreateAccommodationDto
    {
        public PropertyType PropertyType { get; set; }
        public decimal PricePerNight { get; set; }
        public int? RoomsCount { get; set; }
        public int? BedsCount { get; set; }
        public string? Description { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;
        
        public string Country { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string? PostalCode { get; set; }
        public string? Street { get; set; }
        public string? BuildingNumber { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }

        public List<int>? AmenityIds { get; set; }
        public List<string>? PhotoUrls { get; set; }
    }
}
