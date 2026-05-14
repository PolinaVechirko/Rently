using System;

namespace Rently.Application.DTOs
{
    public class AccommodationSearchQueryDto
    {
        public string? SortBy { get; set; }
        public int Limit { get; set; } = 48;
        public int Skip { get; set; }
        public string? Location { get; set; }
        public string? TypesCsv { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? Rooms { get; set; }
        public int? Beds { get; set; }
        public int? Guests { get; set; }
        public string? AmenitiesCsv { get; set; }
        public DateTime? CheckIn { get; set; }
        public DateTime? CheckOut { get; set; }
    }
}
