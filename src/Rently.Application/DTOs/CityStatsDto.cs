namespace Rently.Application.DTOs
{
    public class CityStatsDto
    {
        public string City { get; set; } = string.Empty;
        public int ActiveHomesCount { get; set; }
        public int VisitorsCount { get; set; }
    }
}

