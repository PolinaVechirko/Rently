using System.Net;
using System.Net.Http.Json;
using Rently.Application.DTOs;

namespace Rently.Api.Tests.Integration;

public class AccommodationsIntegrationTests
{
    [Fact]
    public async Task CreateAccommodation_WithoutAuthentication_ReturnsUnauthorized()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/accommodations", BuildCreateDto());

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateAccommodation_AsGuest_ReturnsForbidden()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var auth = await TestAuthClient.RegisterAsync(
            client,
            $"guest-{Guid.NewGuid():N}@example.com",
            "Qwerty.123",
            "Guest User",
            "Guest");
        TestAuthClient.UseBearerToken(client, auth.Token!);

        var response = await client.PostAsJsonAsync("/api/accommodations", BuildCreateDto());

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task CreateAccommodation_AsHost_ThenGetById_ReturnsCreatedAccommodation()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var auth = await TestAuthClient.RegisterAsync(
            client,
            $"host-{Guid.NewGuid():N}@example.com",
            "Qwerty.123",
            "Host User",
            "Host");
        TestAuthClient.UseBearerToken(client, auth.Token!);

        var createResponse = await client.PostAsJsonAsync("/api/accommodations", BuildCreateDto());

        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<AccommodationDto>();
        Assert.NotNull(created);
        Assert.True(created!.Id > 0);
        Assert.Equal("Warsaw", created.City);
        Assert.NotEmpty(created.Title);

        var getResponse = await client.GetAsync($"/api/accommodations/{created.Id}");

        getResponse.EnsureSuccessStatusCode();
        var fetched = await getResponse.Content.ReadFromJsonAsync<AccommodationDto>();
        Assert.NotNull(fetched);
        Assert.Equal(created.Id, fetched!.Id);
        Assert.Equal(created.HostId, fetched.HostId);
        Assert.Equal("Poland", fetched.Country);
        Assert.Equal("/photo-1.jpg", fetched.Photos.First());
    }

    private static CreateAccommodationDto BuildCreateDto()
    {
        return new CreateAccommodationDto
        {
            PropertyType = Rently.Domain.Entities.PropertyType.Apartment,
            PricePerNight = 199,
            RoomsCount = 2,
            BedsCount = 3,
            Description = "Bright apartment close to the city center with lots of light.",
            Title = "",
            Country = "Poland",
            City = "Warsaw",
            PostalCode = "00-001",
            Street = "Marszalkowska",
            BuildingNumber = "10A",
            Latitude = 52.2297,
            Longitude = 21.0122,
            IsActive = true,
            VisibleFrom = DateTime.UtcNow.Date,
            AmenityIds = [],
            PhotoUrls = ["/photo-1.jpg"]
        };
    }
}
