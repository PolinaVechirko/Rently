using Rently.Application.DTOs;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Api.Mappers;

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
            AccommodationPhotoUrl = entity.Accommodation?.Photos?.FirstOrDefault()?.Url,
            PricePerNight = entity.Accommodation?.PricePerNight,
            GuestName = guest?.FullName,
            GuestAvatarUrl = guest?.ProfilePhotoUrl
        };
    }
}
