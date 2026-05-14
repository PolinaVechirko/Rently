namespace Rently.Application.DTOs
{
    public class ReviewEligibilityDto
    {
        public bool CanReview { get; set; }
        public bool HasExistingReview { get; set; }
        public int? ReviewId { get; set; }
        public int? Rating { get; set; }
        public string? Comment { get; set; }
    }
}
