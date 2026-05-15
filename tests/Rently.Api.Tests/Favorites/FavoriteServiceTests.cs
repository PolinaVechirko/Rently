using Rently.Application.Exceptions;
using Rently.Application.Services.Favorites;
using Rently.Domain.Entities;

namespace Rently.Api.Tests.Favorites;

public class FavoriteServiceTests
{
    [Fact]
    public async Task AddFavoriteAsync_MissingAccommodation_ThrowsNotFoundException()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        var service = new FavoriteService(db);

        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            service.AddFavoriteAsync("user-1", 999, "Guest"));

        Assert.Equal("Accommodation not found.", exception.Message);
    }

    [Fact]
    public async Task AddFavoriteAsync_DuplicateFavorite_ReturnsNull()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Accommodations.Add(new Accommodation
        {
            Id = 10,
            HostId = "host-1",
            PropertyType = PropertyType.Apartment,
            PricePerNight = 120,
            Description = "Nice place",
            Title = "Apartment",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        db.Favorites.Add(new Favorite
        {
            UserId = "user-1",
            AccommodationId = 10,
            Type = FavoriteType.Guest
        });
        await db.SaveChangesAsync();

        var service = new FavoriteService(db);

        var result = await service.AddFavoriteAsync("user-1", 10, "Guest");

        Assert.Null(result);
    }

    [Fact]
    public async Task AddFavoriteAsync_NewFavorite_PersistsFavorite()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Accommodations.Add(new Accommodation
        {
            Id = 11,
            HostId = "host-1",
            PropertyType = PropertyType.House,
            PricePerNight = 220,
            Description = "Family house",
            Title = "House",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new FavoriteService(db);

        var result = await service.AddFavoriteAsync("user-2", 11, "Host");

        Assert.NotNull(result);
        Assert.Equal(FavoriteType.Host, result!.Type);
        Assert.Single(db.Favorites);
    }

    [Fact]
    public async Task AddFavoriteAsync_InvalidFavoriteType_ThrowsAppValidationException()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Accommodations.Add(new Accommodation
        {
            Id = 12,
            HostId = "host-1",
            PropertyType = PropertyType.Apartment,
            PricePerNight = 90,
            Description = "Studio",
            Title = "Studio",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new FavoriteService(db);

        var exception = await Assert.ThrowsAsync<AppValidationException>(() =>
            service.AddFavoriteAsync("user-3", 12, "AlienMode"));

        Assert.Equal("Favorite type must be either Guest or Host.", exception.Message);
    }

    [Fact]
    public async Task RemoveFavoriteAsync_InvalidFavoriteType_ThrowsAppValidationException()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        var service = new FavoriteService(db);

        var exception = await Assert.ThrowsAsync<AppValidationException>(() =>
            service.RemoveFavoriteAsync("user-4", 15, "???"));

        Assert.Equal("Favorite type must be either Guest or Host.", exception.Message);
    }
}
