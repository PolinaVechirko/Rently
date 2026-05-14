using System;

namespace Rently.Application.DTOs
{
    public class AccommodationListQueryDto
    {
        public string? SortBy { get; set; }
        public int Limit { get; set; } = 100;
        public int Skip { get; set; }
        public string? Location { get; set; }
        public string? Type { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? Rooms { get; set; }
        public int? Beds { get; set; }
        public int? AmenityId { get; set; }
        public DateTime? CheckIn { get; set; }
        public DateTime? CheckOut { get; set; }
    }
}
