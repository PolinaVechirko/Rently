using Rently.Application.Services.Accommodations;

namespace Rently.Api.Tests.Accommodations;

public class AccommodationHomepageCacheTests
{
    [Fact]
    public void HighestRatedKey_BuildsExpectedKey()
    {
        var key = AccommodationHomepageCache.HighestRatedKey(16);

        Assert.Equal("homepage:highest-rated:v2:16", key);
    }

    [Fact]
    public void MostVisitedKey_BuildsExpectedKey()
    {
        var key = AccommodationHomepageCache.MostVisitedKey(12, 24);

        Assert.Equal("homepage:most-visited:v2:12:24", key);
    }

    [Fact]
    public void CacheDuration_IsFiveMinutes()
    {
        Assert.Equal(TimeSpan.FromMinutes(5), AccommodationHomepageCache.CacheDuration);
    }
}
