using Rently.Domain.Entities;

namespace Rently.Application.Services.Accommodations;

internal sealed class HomepageAccommodationRow
{
    public int Id { get; init; }
    public string HostId { get; init; } = string.Empty;
    public PropertyType PropertyType { get; init; }
    public decimal PricePerNight { get; init; }
    public int RoomsCount { get; init; }
    public int BedsCount { get; init; }
    public string? Description { get; init; }
    public string Title { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public bool IsActive { get; init; }
    public DateTime? VisibleFrom { get; init; }
    public string Country { get; init; } = string.Empty;
    public string City { get; init; } = string.Empty;
    public string? Street { get; init; }
    public int ReviewsCount { get; init; }
    public double AvgRating { get; init; }
    public int Popularity { get; init; }
    public string? FirstPhoto { get; init; }
}
