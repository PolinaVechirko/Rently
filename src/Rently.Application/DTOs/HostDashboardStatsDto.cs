namespace Rently.Application.DTOs
{
    public class HostDashboardStatsDto
    {
        public string HostName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? ProfilePhotoUrl { get; set; }

        public double AverageRating { get; set; }
        public decimal Earnings { get; set; }
        public double ResponseRate { get; set; }
        public int ReviewsCount { get; set; }
        public int ListingsCount { get; set; }
        public int ActiveListingsCount { get; set; }
        public int RentedListingsCount { get; set; }
        public int HiddenListingsCount { get; set; }
    }
}