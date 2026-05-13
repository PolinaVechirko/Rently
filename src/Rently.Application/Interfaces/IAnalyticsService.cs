using System.Collections.Generic;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IAnalyticsService
    {
        Task<IEnumerable<AmenityPopularityDto>> GetTopAmenitiesAsync(int count = 10);
        Task<IEnumerable<CityStatsDto>> GetCityStatsAsync(int count = 10);
        Task<HostDashboardStatsDto> GetHostDashboardStatsAsync(string hostId);
    }
}
