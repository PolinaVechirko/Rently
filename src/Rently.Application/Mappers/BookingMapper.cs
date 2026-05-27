using Rently.Application.DTOs;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Mappers;

internal static class BookingMapper
{
    public static BookingDto ToDto(Booking entity, ApplicationUser? guest = null)
    {
        return new BookingDto
        {
            Id = entity.Id,
            AccommodationId = entity.AccommodationId,
            GuestId = entity.GuestId,
            CheckInDate = entity.CheckInDate,
            CheckOutDate = entity.CheckOutDate,
            Status = entity.Status,
            CreatedAt = entity.CreatedAt,
            AccommodationTitle = entity.Accommodation?.Description,
            AccommodationType = entity.Accommodation?.PropertyType.ToString(),
            AccommodationCountry = entity.Accommodation?.Address?.Country,
            AccommodationCity = entity.Accommodation?.Address?.City,
            AccommodationPhotoUrl = entity.Accommodation?.Photos?
                .OrderBy(photo => photo.Id == entity.Accommodation.CoverPhotoId ? 0 : 1)
                .ThenBy(photo => photo.SortOrder)
                .ThenBy(photo => photo.Id)
                .Select(photo => photo.Url)
                .FirstOrDefault(),
            PricePerNight = entity.Accommodation?.PricePerNight,
            GuestName = guest?.FullName,
            GuestAvatarUrl = guest?.ProfilePhotoUrl
        };
    }
}
