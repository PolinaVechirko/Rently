using System.ComponentModel.DataAnnotations;

namespace Rently.Domain.Entities
{
    public class Photo
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int AccommodationId { get; set; }
        public Accommodation? Accommodation { get; set; }

        [Required]
        public string Url { get; set; } = string.Empty;
    }
}
