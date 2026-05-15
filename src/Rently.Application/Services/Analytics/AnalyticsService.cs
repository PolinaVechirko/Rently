using Microsoft.Extensions.Caching.Memory;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
using Rently.Application.Interfaces;
using Rently.Persistence;

namespace Rently.Application.Services.Analytics;

public class AnalyticsService : IAnalyticsService
{
    private const int DefaultTopAmenitiesCount = 10;

    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;

    public AnalyticsService(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<IEnumerable<AmenityPopularityDto>> GetTopAmenitiesAsync(int count = DefaultTopAmenitiesCount, CancellationToken cancellationToken = default)
    {
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        return await AnalyticsQueries.GetTopAmenitiesAsync(_context, thirtyDaysAgo, count, cancellationToken);
    }

    public async Task<IEnumerable<CityStatsDto>> GetCityStatsAsync(int count = DefaultTopAmenitiesCount, CancellationToken cancellationToken = default)
    {
        var normalizedCount = AnalyticsCache.NormalizeCityStatsCount(count);
        var cacheKey = AnalyticsCache.BuildCityStatsCacheKey(normalizedCount);

        if (_cache.TryGetValue(cacheKey, out List<CityStatsDto>? cached) && cached != null)
        {
            return cached;
        }

        var stats = await AnalyticsQueries.GetCityStatsAsync(_context, normalizedCount, cancellationToken);
        AnalyticsCache.CacheCityStats(_cache, cacheKey, stats);

        return stats;
    }

    public async Task<HostDashboardStatsDto> GetHostDashboardStatsAsync(string hostId, CancellationToken cancellationToken = default)
    {
        var host = await AnalyticsQueries.GetHostAsync(_context, hostId, cancellationToken);
        if (host == null)
        {
            throw new NotFoundException("Host not found.");
        }

        var accommodations = await AnalyticsQueries.GetHostAccommodationsAsync(_context, hostId, cancellationToken);

        var now = DateTime.UtcNow;
        return AnalyticsCalculations.BuildHostDashboardStats(host, accommodations, now);
    }
}
