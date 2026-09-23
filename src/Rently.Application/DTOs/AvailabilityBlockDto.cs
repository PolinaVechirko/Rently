namespace Rently.Application.DTOs;

public class AvailabilityBlockDto
{
    public int Id { get; set; }
    public int AccommodationId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}
