using System;

namespace Rently.Application.DTOs
{
    public class CreateBookingDto
    {
        public int AccommodationId { get; set; }
        public DateTime CheckInDate { get; set; }
        public DateTime CheckOutDate { get; set; }
    }
}
