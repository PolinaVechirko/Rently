using Rently.Application.DTOs;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Accommodations;

internal static class AccommodationQueryFilters
{
    public static IQueryable<Accommodation> ApplyListFilters(
        IQueryable<Accommodation> query,
        AccommodationListQueryDto filters,
        ApplicationDbContext dbContext)
    {
        query = ApplyLocationFilter(query, filters.Location);
        query = ApplyPropertyTypeFilter(query, filters.Type);
        query = ApplyPriceAndCapacityFilters(query, filters.MinPrice, filters.MaxPrice, filters.Rooms, filters.Beds);
        query = ApplyAmenityIdFilter(query, filters.AmenityId);
        query = ApplyAvailabilityFilter(query, filters.CheckIn, filters.CheckOut, dbContext);

        return query;
    }

    public static IQueryable<Accommodation> ApplySearchFilters(
        IQueryable<Accommodation> query,
        AccommodationSearchQueryDto filters,
        DateTime? checkIn,
        DateTime? checkOut,
        ApplicationDbContext dbContext)
    {
        query = ApplyLocationFilter(query, filters.Location);
        query = ApplyPropertyTypesCsvFilter(query, filters.TypesCsv);
        query = ApplyPriceAndCapacityFilters(query, filters.MinPrice, filters.MaxPrice, filters.Rooms, filters.Beds);
        query = ApplyGuestsFilter(query, filters.Guests);
        query = ApplyAmenitiesCsvFilter(query, filters.AmenitiesCsv);
        query = ApplyAvailabilityFilter(query, checkIn, checkOut, dbContext);

        return query;
    }

    private static IQueryable<Accommodation> ApplyLocationFilter(IQueryable<Accommodation> query, string? location)
    {
        if (string.IsNullOrWhiteSpace(location))
        {
            return query;
        }

        var locationTerms = location
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value.ToLower())
            .Distinct()
            .ToList();

        if (locationTerms.Count == 0)
        {
            return query;
        }

        query = query.Where(accommodation => accommodation.Address != null);

        if (locationTerms.Count == 1)
        {
            var singleTerm = locationTerms[0];
            return query.Where(accommodation =>
                (accommodation.Address!.City != null &&
                 accommodation.Address.City.ToLower().Contains(singleTerm)) ||
                (accommodation.Address!.Country != null &&
                 accommodation.Address.Country.ToLower().Contains(singleTerm)));
        }

        foreach (var term in locationTerms)
        {
            var currentTerm = term;
            query = query.Where(accommodation =>
                (accommodation.Address!.City != null &&
                 accommodation.Address.City.ToLower().Contains(currentTerm)) ||
                (accommodation.Address!.Country != null &&
                 accommodation.Address.Country.ToLower().Contains(currentTerm)));
        }

        return query;
    }

    private static IQueryable<Accommodation> ApplyPropertyTypeFilter(IQueryable<Accommodation> query, string? type)
    {
        if (string.IsNullOrWhiteSpace(type) || !Enum.TryParse<PropertyType>(type, true, out var propertyType))
        {
            return query;
        }

        return query.Where(accommodation => accommodation.PropertyType == propertyType);
    }

    private static IQueryable<Accommodation> ApplyPropertyTypesCsvFilter(IQueryable<Accommodation> query, string? typesCsv)
    {
        if (string.IsNullOrWhiteSpace(typesCsv))
        {
            return query;
        }

        var propertyTypes = typesCsv
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(value => Enum.TryParse<PropertyType>(value.Replace(" ", ""), true, out var parsed)
                ? (PropertyType?)parsed
                : null)
            .Where(value => value.HasValue)
            .Select(value => value!.Value)
            .Distinct()
            .ToList();

        return propertyTypes.Count == 0
            ? query
            : query.Where(accommodation => propertyTypes.Contains(accommodation.PropertyType));
    }

    private static IQueryable<Accommodation> ApplyPriceAndCapacityFilters(
        IQueryable<Accommodation> query,
        decimal? minPrice,
        decimal? maxPrice,
        int? rooms,
        int? beds)
    {
        if (minPrice.HasValue)
        {
            query = query.Where(accommodation => accommodation.PricePerNight >= minPrice.Value);
        }

        if (maxPrice.HasValue)
        {
            query = query.Where(accommodation => accommodation.PricePerNight <= maxPrice.Value);
        }

        if (rooms.HasValue)
        {
            query = query.Where(accommodation => accommodation.RoomsCount >= rooms.Value);
        }

        if (beds.HasValue)
        {
            query = query.Where(accommodation => accommodation.BedsCount >= beds.Value);
        }

        return query;
    }

    private static IQueryable<Accommodation> ApplyAmenityIdFilter(IQueryable<Accommodation> query, int? amenityId)
    {
        return amenityId.HasValue
            ? query.Where(accommodation =>
                accommodation.AccommodationAmenities!.Any(amenity => amenity.AmenityId == amenityId.Value))
            : query;
    }

    private static IQueryable<Accommodation> ApplyGuestsFilter(IQueryable<Accommodation> query, int? guests)
    {
        return guests.HasValue && guests.Value > 0
            ? query.Where(accommodation => (accommodation.BedsCount ?? 0) >= guests.Value)
            : query;
    }

    private static IQueryable<Accommodation> ApplyAmenitiesCsvFilter(IQueryable<Accommodation> query, string? amenitiesCsv)
    {
        if (string.IsNullOrWhiteSpace(amenitiesCsv))
        {
            return query;
        }

        var amenityNames = amenitiesCsv
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.ToLower())
            .Distinct()
            .ToList();

        return amenityNames.Count == 0
            ? query
            : query.Where(accommodation =>
                accommodation.AccommodationAmenities != null &&
                accommodation.AccommodationAmenities.Any(amenity =>
                    amenity.Amenity != null && amenityNames.Contains(amenity.Amenity.Name.ToLower())));
    }

    private static IQueryable<Accommodation> ApplyAvailabilityFilter(
        IQueryable<Accommodation> query,
        DateTime? checkIn,
        DateTime? checkOut,
        ApplicationDbContext dbContext)
    {
        if (!checkIn.HasValue || !checkOut.HasValue)
        {
            return query;
        }

        var normalizedCheckIn = checkIn.Value.Date;
        var normalizedCheckOut = checkOut.Value.Date;

        return query.Where(accommodation =>
            (accommodation.Bookings == null || !accommodation.Bookings.Any(booking =>
                booking.Status != BookingStatus.Cancelled &&
                booking.CheckInDate < normalizedCheckOut &&
                booking.CheckOutDate > normalizedCheckIn)) &&
            !dbContext.AvailabilityBlocks.Any(block =>
                block.AccommodationId == accommodation.Id &&
                normalizedCheckIn < block.EndDate &&
                normalizedCheckOut > block.StartDate));
    }
}
