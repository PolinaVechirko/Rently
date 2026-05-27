using Rently.Application.DTOs;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Mappers;

public static class AccommodationMapper
{
    private const string DefaultHostAvatarUrl = "/icons/user.svg";
    private const string RelativeHostAvatarUrl = "./icons/user.svg";

    public static AccommodationDto ToDto(
        Accommodation entity,
        ApplicationUser? host = null,
        Dictionary<string, ApplicationUser>? reviewers = null,
        List<AvailabilityBlock>? availabilityBlocks = null)
    {
        var confirmedBookings = entity.Bookings?.Where(b => b.Status == BookingStatus.Confirmed).ToList() ?? new List<Booking>();
        var unavailableBookings = entity.Bookings?
            .Where(b =>
                b.Status == BookingStatus.Confirmed ||
                b.Status == BookingStatus.Pending)
            .ToList() ?? new List<Booking>();
        var unavailableDateRanges = BuildUnavailableDateRanges(unavailableBookings, availabilityBlocks);
        var totalEarnings = CalculateTotalEarnings(confirmedBookings, entity.PricePerNight);
        var nextAvailableDate = CalculateNextAvailableDate(confirmedBookings);
        var reviews = BuildReviewDtos(entity.Reviews, reviewers);

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
            AverageRating = entity.Reviews != null && entity.Reviews.Any() ? entity.Reviews.Average(r => r.Rating) : 0,
            ReviewsCount = entity.Reviews?.Count ?? 0,
            FavoritesCount = entity.FavoritedBy?.Count ?? 0,
            Country = entity.Address?.Country ?? "",
            City = entity.Address?.City ?? "",
            Street = entity.Address?.Street,
            Amenities = entity.AccommodationAmenities?
                .Where(aa => aa.Amenity != null && !string.IsNullOrEmpty(aa.Amenity.Name))
                .Select(aa => aa.Amenity!.Name)
                .ToList() ?? new List<string>(),
            Photos = GetOrderedPhotoUrls(entity),
            IsRented = confirmedBookings.Any(b =>
                b.CheckInDate <= DateTime.UtcNow &&
                b.CheckOutDate >= DateTime.UtcNow),
            TotalEarnings = totalEarnings,
            NextAvailableDate = nextAvailableDate,
            UnavailableDateRanges = unavailableDateRanges,
            Reviews = reviews,
            HostName = host?.FullName,
            HostAvatarUrl = host?.ProfilePhotoUrl ?? DefaultHostAvatarUrl,
            HostCreatedAt = host?.CreatedAt,
            HostEmail = host?.Email
        };
    }

    public static AccommodationDto ToListDto(Accommodation entity)
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
            AverageRating = entity.Reviews != null && entity.Reviews.Any() ? entity.Reviews.Average(r => r.Rating) : 0,
            ReviewsCount = entity.Reviews?.Count ?? 0,
            FavoritesCount = entity.FavoritedBy?.Count ?? 0,
            Country = entity.Address?.Country ?? "",
            City = entity.Address?.City ?? "",
            Street = entity.Address?.Street,
            Amenities = entity.AccommodationAmenities?
                .Where(aa => aa.Amenity != null)
                .Select(aa => aa.Amenity!.Name)
                .ToList() ?? new List<string>(),
            Photos = GetOrderedPhotoUrls(entity),
            IsRented = false,
            TotalEarnings = 0,
            NextAvailableDate = DateTime.UtcNow.Date,
            Reviews = null,
            HostName = null,
            HostAvatarUrl = RelativeHostAvatarUrl,
            HostCreatedAt = null,
            HostEmail = null
        };
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

    private static List<UnavailableDateRangeDto> BuildUnavailableDateRanges(
        List<Booking> unavailableBookings,
        List<AvailabilityBlock>? availabilityBlocks)
    {
        var unavailableDateRanges = unavailableBookings
            .Where(b => b.CheckOutDate.Date > DateTime.UtcNow.Date)
            .Select(b => new UnavailableDateRangeDto
            {
                StartDate = b.CheckInDate.Date,
                EndDate = b.CheckOutDate.Date
            })
            .ToList();

        if (availabilityBlocks == null || availabilityBlocks.Count == 0)
        {
            return unavailableDateRanges;
        }

        unavailableDateRanges.AddRange(
            availabilityBlocks
                .Where(block => block.EndDate.Date > DateTime.UtcNow.Date)
                .Select(block => new UnavailableDateRangeDto
                {
                    StartDate = block.StartDate.Date,
                    EndDate = block.EndDate.Date
                }));

        return unavailableDateRanges;
    }

    private static decimal CalculateTotalEarnings(IEnumerable<Booking> confirmedBookings, decimal pricePerNight)
    {
        decimal totalEarnings = 0;

        foreach (var booking in confirmedBookings)
        {
            if (booking.CheckInDate >= DateTime.UtcNow)
            {
                continue;
            }

            var days = (decimal)(booking.CheckOutDate - booking.CheckInDate).TotalDays;
            totalEarnings += days * pricePerNight;
        }

        return totalEarnings;
    }

    private static DateTime CalculateNextAvailableDate(IEnumerable<Booking> confirmedBookings)
    {
        var nextAvailable = DateTime.UtcNow.Date;
        var futureBookings = confirmedBookings
            .Where(b => b.CheckOutDate > DateTime.UtcNow)
            .OrderBy(b => b.CheckInDate)
            .ToList();

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

    private static List<ReviewDto>? BuildReviewDtos(
        ICollection<Review>? reviews,
        Dictionary<string, ApplicationUser>? reviewers)
    {
        return reviews?.Select(review => new ReviewDto
        {
            Id = review.Id,
            Comment = review.Comment,
            HostReply = review.HostReply,
            HostReplyCreatedAt = review.HostReplyCreatedAt,
            Rating = review.Rating,
            CreatedAt = review.CreatedAt,
            ReviewerName = reviewers != null && reviewers.TryGetValue(review.GuestId, out var guest)
                ? guest.FullName
                : "Anonymous",
            ReviewerAvatarUrl = reviewers != null && reviewers.TryGetValue(review.GuestId, out var avatarGuest)
                ? avatarGuest.ProfilePhotoUrl ?? DefaultHostAvatarUrl
                : DefaultHostAvatarUrl
        }).ToList();
    }

    private static List<string> GetOrderedPhotoUrls(Accommodation entity)
    {
        return entity.Photos?
            .OrderBy(photo => photo.Id == entity.CoverPhotoId ? 0 : 1)
            .ThenBy(photo => photo.SortOrder)
            .ThenBy(photo => photo.Id)
            .Select(photo => photo.Url)
            .ToList() ?? new List<string>();
    }
}
