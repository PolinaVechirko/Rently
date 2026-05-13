using System;
using Rently.Domain.Entities;

namespace Rently.Application.DTOs
{
    public class BookingDto
    {
        public int Id { get; set; }
        public int AccommodationId { get; set; }
        public string GuestId { get; set; } = string.Empty;
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
        public BookingStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        
        public string? AccommodationTitle { get; set; }
        public string? AccommodationType { get; set; }
        public string? AccommodationCountry { get; set; }
        public string? AccommodationCity { get; set; }
        public string? AccommodationPhotoUrl { get; set; }
        public decimal? PricePerNight { get; set; }
        public string? GuestName { get; set; }
        public string? GuestAvatarUrl { get; set; }
    }
}
