namespace Rently.Application.Services.Accommodations;

internal static class AccommodationHomepageCache
{
    private static readonly TimeSpan Duration = TimeSpan.FromMinutes(5);

    public static string HighestRatedKey(int count) => $"homepage:highest-rated:v2:{count}";

    public static string MostVisitedKey(int count, int skip) => $"homepage:most-visited:v2:{count}:{skip}";

    public static TimeSpan CacheDuration => Duration;
}
