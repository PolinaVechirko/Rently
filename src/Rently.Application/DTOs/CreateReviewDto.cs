namespace Rently.Application.DTOs
{
    public class CreateReviewDto
    {
        public int AccommodationId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}
