using System;
using System.Collections.Generic;
using Rently.Domain.Entities;

namespace Rently.Application.DTOs
{
    public class AccommodationDto
    {
        public int Id { get; set; }
        public string HostId { get; set; } = string.Empty;
        public string PropertyType { get; set; } = string.Empty;
        public decimal PricePerNight { get; set; }
        public int? RoomsCount { get; set; }
        public int? BedsCount { get; set; }
        public string? Description { get; set; }
        [System.Text.Json.Serialization.JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public bool IsActive { get; set; }
        
        public double AverageRating { get; set; }
        public int ReviewsCount { get; set; }
        public int FavoritesCount { get; set; }
        
        public string Country { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string? Street { get; set; }

        public bool IsRented { get; set; }
        
        public List<string> Amenities { get; set; } = new();
        public List<string> Photos { get; set; } = new();

        public List<ReviewDto>? Reviews { get; set; }
        
        // Host Metadata
        public string? HostName { get; set; }
        public string? HostAvatarUrl { get; set; }
        public DateTime? HostCreatedAt { get; set; }
        public string? HostEmail { get; set; }

        public decimal TotalEarnings { get; set; }
        public DateTime? NextAvailableDate { get; set; }
        public List<UnavailableDateRangeDto> UnavailableDateRanges { get; set; } = new();
    }

    public class UnavailableDateRangeDto
    {
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
    }
}
