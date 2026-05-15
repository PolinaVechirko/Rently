using Rently.Application.DTOs;
using Rently.Application.Mappers;
using Rently.Application.Services.Accommodations;
using Rently.Domain.Entities;

namespace Rently.Api.Tests.Accommodations;

public class AccommodationWriteModelMapperTests
{
    [Fact]
    public void Create_WithoutTitle_BuildsFallbackTitleAndCollections()
    {
        var dto = new CreateAccommodationDto
        {
            PropertyType = PropertyType.Apartment,
            PricePerNight = 180,
            RoomsCount = 2,
            BedsCount = 3,
            Description = "Bright loft in city center",
            Title = "",
            Country = "Poland",
            City = "Warsaw",
            Street = "Main",
            PostalCode = "00-001",
            BuildingNumber = "10",
            Latitude = 52.23,
            Longitude = 21.01,
            AmenityIds = [1, 2],
            PhotoUrls = ["/a.jpg", "/b.jpg"],
            IsActive = true,
            VisibleFrom = new DateTime(2026, 8, 4, 16, 0, 0)
        };

        var accommodation = AccommodationWriteModelMapper.Create("host-1", dto);

        Assert.Equal("host-1", accommodation.HostId);
        Assert.False(string.IsNullOrWhiteSpace(accommodation.Title));
        Assert.Equal(new DateTime(2026, 8, 4), accommodation.VisibleFrom);
        Assert.Equal("Warsaw", accommodation.Address!.City);
        Assert.Equal(2, accommodation.AccommodationAmenities!.Count);
        Assert.Equal(2, accommodation.Photos!.Count);
    }

    [Fact]
    public void ApplyUpdate_WithoutTitle_KeepsFallbackAndPreservesCoordinatesWhenMissing()
    {
        var accommodation = new Accommodation
        {
            Id = 5,
            Title = "Old title",
            Description = "Old description",
            PropertyType = PropertyType.House,
            PricePerNight = 200,
            RoomsCount = 4,
            BedsCount = 5,
            IsActive = true,
            VisibleFrom = new DateTime(2026, 1, 1),
            Address = new Address
            {
                Country = "Poland",
                City = "Krakow",
                Street = "Old",
                PostalCode = "30-001",
                BuildingNumber = "1",
                Latitude = 50.06,
                Longitude = 19.94
            }
        };

        var dto = new UpdateAccommodationDto
        {
            PropertyType = PropertyType.Apartment,
            PricePerNight = 250,
            RoomsCount = 3,
            BedsCount = 4,
            Description = "Updated modern apartment",
            Title = " ",
            Country = "Poland",
            City = "Gdansk",
            Street = "New",
            PostalCode = "80-001",
            BuildingNumber = "9",
            Latitude = null,
            Longitude = null,
            AmenityIds = [4],
            PhotoUrls = ["/new.jpg"],
            IsActive = false,
            VisibleFrom = new DateTime(2026, 9, 10, 13, 0, 0)
        };

        AccommodationWriteModelMapper.ApplyUpdate(accommodation, dto);

        Assert.False(string.IsNullOrWhiteSpace(accommodation.Title));
        Assert.Equal(new DateTime(2026, 9, 10), accommodation.VisibleFrom);
        Assert.Equal("Gdansk", accommodation.Address!.City);
        Assert.Equal(50.06, accommodation.Address.Latitude);
        Assert.Equal(19.94, accommodation.Address.Longitude);
        Assert.Single(accommodation.AccommodationAmenities!);
        Assert.Single(accommodation.Photos!);
    }

    [Fact]
    public void BuildTitle_PunctuationOnlyDescription_FallsBackToProvidedTitle()
    {
        var title = AccommodationMapper.BuildTitle(null, " ... !!! ??? ", "Property");

        Assert.Equal("Property", title);
    }

    [Fact]
    public void BuildTitle_LongFirstSentence_TruncatesToSixtyCharacters()
    {
        const string description = "This is a very long first sentence designed to overflow the sixty character title limit before it ends. Second sentence.";

        var title = AccommodationMapper.BuildTitle(null, description, "Property");

        Assert.Equal(60, title.Length);
        Assert.EndsWith("...", title);
    }

    [Fact]
    public void ToDto_AdjacentConfirmedBookings_MoveNextAvailableDateAcrossContiguousRange()
    {
        var today = DateTime.UtcNow.Date;
        var accommodation = new Accommodation
        {
            Id = 20,
            HostId = "host-20",
            PropertyType = PropertyType.Apartment,
            PricePerNight = 100,
            Title = "Apartment",
            Description = "Desc",
            IsActive = true,
            CreatedAt = today,
            Bookings =
            [
                new Booking
                {
                    Status = BookingStatus.Confirmed,
                    CheckInDate = today.AddDays(-1),
                    CheckOutDate = today.AddDays(2)
                },
                new Booking
                {
                    Status = BookingStatus.Confirmed,
                    CheckInDate = today.AddDays(2),
                    CheckOutDate = today.AddDays(5)
                }
            ]
        };

        var dto = AccommodationMapper.ToDto(accommodation);

        Assert.Equal(today.AddDays(5), dto.NextAvailableDate);
    }

    [Fact]
    public void ToDto_FiltersOutPastAvailabilityBlocksFromUnavailableRanges()
    {
        var today = DateTime.UtcNow.Date;
        var accommodation = new Accommodation
        {
            Id = 21,
            HostId = "host-21",
            PropertyType = PropertyType.House,
            PricePerNight = 150,
            Title = "House",
            Description = "Desc",
            IsActive = true,
            CreatedAt = today
        };

        var availabilityBlocks = new List<AvailabilityBlock>
        {
            new()
            {
                AccommodationId = 21,
                StartDate = today.AddDays(-10),
                EndDate = today.AddDays(-2)
            },
            new()
            {
                AccommodationId = 21,
                StartDate = today.AddDays(3),
                EndDate = today.AddDays(5)
            }
        };

        var dto = AccommodationMapper.ToDto(accommodation, availabilityBlocks: availabilityBlocks);

        Assert.Single(dto.UnavailableDateRanges!);
        Assert.Equal(today.AddDays(3), dto.UnavailableDateRanges[0].StartDate);
        Assert.Equal(today.AddDays(5), dto.UnavailableDateRanges[0].EndDate);
    }
}
