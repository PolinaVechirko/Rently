using Rently.Application.DTOs;
using Rently.Application.Mappers;
using Rently.Domain.Entities;

namespace Rently.Application.Services.Accommodations;

internal static class AccommodationWriteModelMapper
{
    public static Accommodation Create(string hostId, CreateAccommodationDto dto)
    {
        var accommodation = new Accommodation
        {
            HostId = hostId,
            PropertyType = dto.PropertyType,
            PricePerNight = dto.PricePerNight,
            RoomsCount = NormalizeCount(dto.RoomsCount),
            BedsCount = NormalizeCount(dto.BedsCount),
            Description = dto.Description,
            Title = AccommodationMapper.BuildTitle(dto.Title, dto.Description, "Property"),
            IsActive = dto.IsActive,
            VisibleFrom = dto.VisibleFrom?.Date,
            CreatedAt = DateTime.UtcNow,
            Address = new Address()
        };

        ApplyAddress(accommodation.Address, dto);
        ApplyAmenities(accommodation, dto.AmenityIds, accommodation.Id);
        ApplyPhotos(accommodation, dto.PhotoUrls, accommodation.Id);

        return accommodation;
    }

    public static void ApplyUpdate(Accommodation accommodation, UpdateAccommodationDto dto)
    {
        accommodation.PropertyType = dto.PropertyType;
        accommodation.PricePerNight = dto.PricePerNight;
        accommodation.RoomsCount = NormalizeCount(dto.RoomsCount);
        accommodation.BedsCount = NormalizeCount(dto.BedsCount);
        accommodation.Description = dto.Description;
        accommodation.Title = BuildUpdatedTitle(dto);
        accommodation.IsActive = dto.IsActive;
        accommodation.VisibleFrom = dto.VisibleFrom?.Date;

        if (accommodation.Address != null)
        {
            ApplyAddress(accommodation.Address, dto);
        }

        if (dto.AmenityIds != null)
        {
            ApplyAmenities(accommodation, dto.AmenityIds, accommodation.Id);
        }

        if (dto.PhotoUrls != null)
        {
            ApplyPhotos(accommodation, dto.PhotoUrls, accommodation.Id);
        }
    }

    private static void ApplyAddress(Address address, CreateAccommodationDto dto)
    {
        address.Country = dto.Country;
        address.City = dto.City;
        address.Street = dto.Street;
        address.PostalCode = dto.PostalCode;
        address.BuildingNumber = dto.BuildingNumber;
        address.Latitude = dto.Latitude;
        address.Longitude = dto.Longitude;
    }

    private static void ApplyAddress(Address address, UpdateAccommodationDto dto)
    {
        address.Country = dto.Country;
        address.City = dto.City;
        address.Street = dto.Street;
        address.PostalCode = dto.PostalCode;
        address.BuildingNumber = dto.BuildingNumber;

        if (dto.Latitude.HasValue)
        {
            address.Latitude = dto.Latitude.Value;
        }

        if (dto.Longitude.HasValue)
        {
            address.Longitude = dto.Longitude.Value;
        }
    }

    private static void ApplyAmenities(Accommodation accommodation, List<int>? amenityIds, int accommodationId)
    {
        if (amenityIds == null)
        {
            return;
        }

        accommodation.AccommodationAmenities = amenityIds
            .Select(amenityId => new AccommodationAmenity
            {
                AccommodationId = accommodationId,
                AmenityId = amenityId
            })
            .ToList();
    }

    private static void ApplyPhotos(Accommodation accommodation, List<string>? photoUrls, int accommodationId)
    {
        if (photoUrls == null)
        {
            return;
        }

        accommodation.Photos = photoUrls
            .Select((url, index) => new Photo
            {
                AccommodationId = accommodationId,
                Url = url,
                SortOrder = index
            })
            .ToList();
    }

    private static string BuildUpdatedTitle(UpdateAccommodationDto dto)
    {
        return string.IsNullOrWhiteSpace(dto.Title)
            ? AccommodationMapper.BuildTitle(null, dto.Description, "Beautiful Property")
            : dto.Title;
    }

    private static int NormalizeCount(int count)
    {
        return Math.Max(0, count);
    }
}
