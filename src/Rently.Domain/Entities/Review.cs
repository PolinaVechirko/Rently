using System;
using System.ComponentModel.DataAnnotations;

namespace Rently.Domain.Entities
{
    public class Review
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AccommodationId { get; set; }
        public Accommodation? Accommodation { get; set; }

        [Required]
        public string GuestId { get; set; } = string.Empty;

        [Required]
        [Range(1, 5)]
        public int Rating { get; set; }

        public string? Comment { get; set; }

        public string? HostReply { get; set; }

        public DateTime? HostReplyCreatedAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
