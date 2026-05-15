using Rently.Application.DTOs;
using Rently.Application.Mappers;

namespace Rently.Application.Services.Accommodations;

internal static class AccommodationHomepageMapper
{
    private const string DefaultHostAvatarUrl = "/icons/user.svg";

    public static List<AccommodationDto> ToDtos(IEnumerable<HomepageAccommodationRow> rows)
    {
        return rows.Select(ToDto).ToList();
    }

    private static AccommodationDto ToDto(HomepageAccommodationRow row)
    {
        return new AccommodationDto
        {
            Id = row.Id,
            HostId = row.HostId,
            PropertyType = row.PropertyType.ToString(),
            PricePerNight = row.PricePerNight,
            RoomsCount = row.RoomsCount,
            BedsCount = row.BedsCount,
            Description = row.Description,
            Title = AccommodationMapper.BuildTitle(row.Title, row.Description, "Property"),
            CreatedAt = row.CreatedAt,
            IsActive = row.IsActive,
            VisibleFrom = row.VisibleFrom,
            AverageRating = row.AvgRating,
            ReviewsCount = row.ReviewsCount,
            Country = row.Country,
            City = row.City,
            Street = row.Street,
            Amenities = [],
            Photos = row.FirstPhoto != null ? [row.FirstPhoto] : [],
            TotalEarnings = 0,
            NextAvailableDate = DateTime.UtcNow.Date,
            Reviews = null,
            HostName = null,
            HostAvatarUrl = DefaultHostAvatarUrl,
            HostCreatedAt = null
        };
    }
}
