using Microsoft.Extensions.Caching.Memory;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
using Rently.Application.Interfaces;
using Rently.Persistence;

namespace Rently.Application.Services.Analytics;

public class AnalyticsService : IAnalyticsService
{
    private const int DefaultTopAmenitiesCount = 10;
    private const int MaxTopAmenitiesCount = 50;
    private const int DefaultCityStatsCount = 10;
    private const int MaxCityStatsCount = 50;
    private static readonly TimeSpan CityStatsCacheDuration = TimeSpan.FromMinutes(5);

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
        var normalizedCount = Math.Clamp(count, 1, MaxTopAmenitiesCount);
        return await AnalyticsQueries.GetTopAmenitiesAsync(_context, thirtyDaysAgo, normalizedCount, cancellationToken);
    }

    public async Task<IEnumerable<CityStatsDto>> GetCityStatsAsync(int count = DefaultCityStatsCount, CancellationToken cancellationToken = default)
    {
        var normalizedCount = Math.Clamp(count, 1, MaxCityStatsCount);
        var cacheKey = $"analytics:city-stats:v1:{normalizedCount}";

        if (_cache.TryGetValue(cacheKey, out List<CityStatsDto>? cached) && cached != null)
        {
            return cached;
        }

        var stats = await AnalyticsQueries.GetCityStatsAsync(_context, normalizedCount, cancellationToken);
        _cache.Set(cacheKey, stats, CityStatsCacheDuration);

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
