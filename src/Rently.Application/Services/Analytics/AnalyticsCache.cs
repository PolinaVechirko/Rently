using Microsoft.Extensions.Caching.Memory;
using Rently.Application.DTOs;

namespace Rently.Application.Services.Analytics;

internal static class AnalyticsCache
{
    private static readonly TimeSpan CityStatsDuration = TimeSpan.FromMinutes(5);
    private const int MaxCityStatsCount = 50;

    public static int NormalizeCityStatsCount(int count) => Math.Clamp(count, 1, MaxCityStatsCount);

    public static string BuildCityStatsCacheKey(int count) => $"analytics:city-stats:v1:{count}";

    public static void CacheCityStats(IMemoryCache cache, string cacheKey, List<CityStatsDto> stats)
    {
        cache.Set(cacheKey, stats, new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = CityStatsDuration
        });
    }
}
