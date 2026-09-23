using Rently.Application.DTOs;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Mappers;

public static class AccommodationMapper
{
    public const string DefaultTitle = "Property";

    public static AccommodationDto ToDto(
        Accommodation entity,
        ApplicationUser? host = null,
        Dictionary<string, ApplicationUser>? reviewers = null,
        List<AvailabilityBlock>? availabilityBlocks = null)
    {
        var now = DateTime.UtcNow;
        var confirmedBookings = entity.Bookings?.Where(b => b.Status == BookingStatus.Confirmed).ToList() ?? [];
        var unavailableBookings = entity.Bookings?
            .Where(b => b.Status is BookingStatus.Confirmed or BookingStatus.Pending)
            .ToList() ?? [];

        var dto = CreateBaseDto(entity);
        dto.IsRented = confirmedBookings.Any(b => b.CheckInDate <= now && b.CheckOutDate >= now);
        dto.TotalEarnings = EarningsCalculator.ForAccommodation(entity, now);
        dto.NextAvailableDate = CalculateNextAvailableDate(confirmedBookings, now);
        dto.UnavailableDateRanges = BuildUnavailableDateRanges(unavailableBookings, availabilityBlocks, now);
        dto.Reviews = entity.Reviews?
            .Select(review => ReviewMapper.ToDto(review, reviewers?.GetValueOrDefault(review.GuestId)))
            .ToList();
        dto.HostName = host?.FullName;
        dto.HostAvatarUrl = host?.ProfilePhotoUrl ?? UserMapper.DefaultAvatarUrl;
        dto.HostCreatedAt = host?.CreatedAt;
        dto.HostEmail = host?.Email;
        return dto;
    }

    /// <summary>
    /// Lightweight card representation used by search results (no reviews, host or booking details).
    /// </summary>
    public static AccommodationDto ToListDto(Accommodation entity)
    {
        var dto = CreateBaseDto(entity);
        dto.NextAvailableDate = DateTime.UtcNow.Date;
        dto.HostAvatarUrl = UserMapper.DefaultAvatarUrl;
        return dto;
    }

    public static string BuildTitle(string? explicitTitle, string? description, string fallbackTitle)
    {
        if (!string.IsNullOrWhiteSpace(explicitTitle))
        {
            return explicitTitle;
        }

        if (string.IsNullOrWhiteSpace(description))
        {
            return fallbackTitle;
        }

        var firstSentence = description
            .Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries)
            .FirstOrDefault()?
            .Trim();

        if (string.IsNullOrWhiteSpace(firstSentence))
        {
            return fallbackTitle;
        }

        return firstSentence.Length > 60
            ? $"{firstSentence.Substring(0, 57)}..."
            : firstSentence;
    }

    private static AccommodationDto CreateBaseDto(Accommodation entity)
    {
        return new AccommodationDto
        {
            Id = entity.Id,
            HostId = entity.HostId,
            PropertyType = entity.PropertyType.ToString(),
            PricePerNight = entity.PricePerNight,
            RoomsCount = entity.RoomsCount,
            BedsCount = entity.BedsCount,
            Description = entity.Description,
            Title = BuildTitle(entity.Title, entity.Description, entity.PropertyType.ToString()),
            CreatedAt = entity.CreatedAt,
            IsActive = entity.IsActive,
            VisibleFrom = entity.VisibleFrom?.Date,
            AverageRating = entity.Reviews is { Count: > 0 } ? entity.Reviews.Average(r => r.Rating) : 0,
            ReviewsCount = entity.Reviews?.Count ?? 0,
            FavoritesCount = entity.FavoritedBy?.Count(favorite => favorite.Type == FavoriteType.Guest) ?? 0,
            Country = entity.Address?.Country ?? "",
            City = entity.Address?.City ?? "",
            Street = entity.Address?.Street,
            Amenities = entity.AccommodationAmenities?
                .Where(aa => !string.IsNullOrEmpty(aa.Amenity?.Name))
                .Select(aa => aa.Amenity!.Name)
                .ToList() ?? [],
            Photos = GetOrderedPhotoUrls(entity)
        };
    }

    private static List<UnavailableDateRangeDto> BuildUnavailableDateRanges(
        List<Booking> unavailableBookings,
        List<AvailabilityBlock>? availabilityBlocks,
        DateTime now)
    {
        var today = now.Date;
        var bookingRanges = unavailableBookings
            .Where(b => b.CheckOutDate.Date > today)
            .Select(b => new UnavailableDateRangeDto { StartDate = b.CheckInDate.Date, EndDate = b.CheckOutDate.Date });

        var blockRanges = (availabilityBlocks ?? [])
            .Where(block => block.EndDate.Date > today)
            .Select(block => new UnavailableDateRangeDto { StartDate = block.StartDate.Date, EndDate = block.EndDate.Date });

        return bookingRanges.Concat(blockRanges).ToList();
    }

    private static DateTime CalculateNextAvailableDate(IEnumerable<Booking> confirmedBookings, DateTime now)
    {
        var nextAvailable = now.Date;
        var futureBookings = confirmedBookings
            .Where(b => b.CheckOutDate > now)
            .OrderBy(b => b.CheckInDate);

        foreach (var booking in futureBookings)
        {
            if (booking.CheckInDate > nextAvailable)
            {
                break;
            }

            nextAvailable = booking.CheckOutDate.Date;
        }

        return nextAvailable;
    }

    private static List<string> GetOrderedPhotoUrls(Accommodation entity)
    {
        return entity.Photos?
            .OrderBy(photo => photo.Id == entity.CoverPhotoId ? 0 : 1)
            .ThenBy(photo => photo.SortOrder)
            .ThenBy(photo => photo.Id)
            .Select(photo => photo.Url)
            .ToList() ?? [];
    }
}
