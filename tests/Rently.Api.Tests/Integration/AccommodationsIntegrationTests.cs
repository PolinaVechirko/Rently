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

    [Fact]
    public async Task CreateAccommodation_WithMultiplePhotos_PreservesPhotoOrder()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var auth = await TestAuthClient.RegisterAsync(
            client,
            $"host-photos-{Guid.NewGuid():N}@example.com",
            "Qwerty.123",
            "Host Photo User",
            "Host");
        TestAuthClient.UseBearerToken(client, auth.Token!);

        var dto = BuildCreateDto();
        dto.PhotoUrls = ["/cover.jpg", "/second.jpg", "/third.jpg"];

        var createResponse = await client.PostAsJsonAsync("/api/accommodations", dto);

        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.Content.ReadFromJsonAsync<AccommodationDto>();

        Assert.NotNull(created);
        Assert.Equal(["/cover.jpg", "/second.jpg", "/third.jpg"], created!.Photos);

        var getResponse = await client.GetAsync($"/api/accommodations/{created.Id}");
        getResponse.EnsureSuccessStatusCode();
        var fetched = await getResponse.Content.ReadFromJsonAsync<AccommodationDto>();

        Assert.NotNull(fetched);
        Assert.Equal(["/cover.jpg", "/second.jpg", "/third.jpg"], fetched!.Photos);
    }

    [Fact]
    public async Task SearchAccommodations_WithCityCountryLocation_ReturnsMatchingAccommodation()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var auth = await TestAuthClient.RegisterAsync(
            client,
            $"host-search-{Guid.NewGuid():N}@example.com",
            "Qwerty.123",
            "Host Search User",
            "Host");
        TestAuthClient.UseBearerToken(client, auth.Token!);

        var createResponse = await client.PostAsJsonAsync("/api/accommodations", BuildCreateDto());
        createResponse.EnsureSuccessStatusCode();

        var searchResponse = await client.GetAsync("/api/accommodations/search?location=Warsaw%2C%20Poland&limit=20&skip=0");

        searchResponse.EnsureSuccessStatusCode();
        var searchResult = await searchResponse.Content.ReadFromJsonAsync<PagedResultDto<AccommodationDto>>();

        Assert.NotNull(searchResult);
        Assert.NotNull(searchResult!.Items);
        Assert.Contains(searchResult.Items, item =>
            item.City == "Warsaw" &&
            item.Country == "Poland" &&
            item.PropertyType == "Apartment");
    }

    [Fact]
    public async Task SearchAccommodations_WithCityOnlyLocation_ReturnsMatchingAccommodation()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var auth = await TestAuthClient.RegisterAsync(
            client,
            $"host-search-city-{Guid.NewGuid():N}@example.com",
            "Qwerty.123",
            "Host Search City User",
            "Host");
        TestAuthClient.UseBearerToken(client, auth.Token!);

        var createResponse = await client.PostAsJsonAsync("/api/accommodations", BuildCreateDto());
        createResponse.EnsureSuccessStatusCode();

        var searchResponse = await client.GetAsync("/api/accommodations/search?location=Warsaw&limit=20&skip=0");

        searchResponse.EnsureSuccessStatusCode();
        var searchResult = await searchResponse.Content.ReadFromJsonAsync<PagedResultDto<AccommodationDto>>();

        Assert.NotNull(searchResult);
        Assert.NotNull(searchResult!.Items);
        Assert.Contains(searchResult.Items, item =>
            item.City == "Warsaw" &&
            item.Country == "Poland");
    }

    [Fact]
    public async Task SearchAccommodations_WithCountryOnlyLocation_ReturnsMatchingAccommodation()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var auth = await TestAuthClient.RegisterAsync(
            client,
            $"host-search-country-{Guid.NewGuid():N}@example.com",
            "Qwerty.123",
            "Host Search Country User",
            "Host");
        TestAuthClient.UseBearerToken(client, auth.Token!);

        var createResponse = await client.PostAsJsonAsync("/api/accommodations", BuildCreateDto());
        createResponse.EnsureSuccessStatusCode();

        var searchResponse = await client.GetAsync("/api/accommodations/search?location=Poland&limit=20&skip=0");

        searchResponse.EnsureSuccessStatusCode();
        var searchResult = await searchResponse.Content.ReadFromJsonAsync<PagedResultDto<AccommodationDto>>();

        Assert.NotNull(searchResult);
        Assert.NotNull(searchResult!.Items);
        Assert.Contains(searchResult.Items, item =>
            item.City == "Warsaw" &&
            item.Country == "Poland");
    }

    [Fact]
    public async Task HomepageEndpoints_WithAccommodationPhotos_ReturnSuccessfulArrays()
    {
        await using var factory = new TestApiFactory();
        using var client = factory.CreateClient();

        var auth = await TestAuthClient.RegisterAsync(
            client,
            $"host-homepage-{Guid.NewGuid():N}@example.com",
            "Qwerty.123",
            "Host Homepage User",
            "Host");
        TestAuthClient.UseBearerToken(client, auth.Token!);

        var dto = BuildCreateDto();
        dto.PhotoUrls = ["/cover.jpg", "/second.jpg"];

        var createResponse = await client.PostAsJsonAsync("/api/accommodations", dto);
        createResponse.EnsureSuccessStatusCode();

        client.DefaultRequestHeaders.Authorization = null;

        var highestRatedResponse = await client.GetAsync("/api/accommodations/homepage/highest-rated?count=16");
        highestRatedResponse.EnsureSuccessStatusCode();
        var highestRated = await highestRatedResponse.Content.ReadFromJsonAsync<List<AccommodationDto>>();

        Assert.NotNull(highestRated);
        Assert.IsType<List<AccommodationDto>>(highestRated);

        var mostVisitedResponse = await client.GetAsync("/api/accommodations/homepage/most-visited?count=16&skip=0");
        mostVisitedResponse.EnsureSuccessStatusCode();
        var mostVisited = await mostVisitedResponse.Content.ReadFromJsonAsync<List<AccommodationDto>>();

        Assert.NotNull(mostVisited);
        Assert.Contains(mostVisited!, item => item.Photos.FirstOrDefault() == "/cover.jpg");
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
