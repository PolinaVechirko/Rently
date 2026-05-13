using System;
using System.ComponentModel.DataAnnotations;

namespace Rently.Domain.Entities
{
    public class AvailabilityBlock
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AccommodationId { get; set; }

        public Accommodation? Accommodation { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        [Required]
        public DateTime EndDate { get; set; }

        public string? Note { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}