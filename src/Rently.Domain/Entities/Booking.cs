using System;
using System.ComponentModel.DataAnnotations;

namespace Rently.Domain.Entities
{
    public class Booking
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AccommodationId { get; set; }
        public Accommodation? Accommodation { get; set; }

        [Required]
        public string GuestId { get; set; } = string.Empty;

        [Required]
        public DateTime CheckInDate { get; set; }

        [Required]
        public DateTime CheckOutDate { get; set; }

        [Required]
        public BookingStatus Status { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
