using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IAnalyticsService
    {
        Task<IEnumerable<AmenityPopularityDto>> GetTopAmenitiesAsync(int count = 10, CancellationToken cancellationToken = default);
        Task<IEnumerable<CityStatsDto>> GetCityStatsAsync(int count = 10, CancellationToken cancellationToken = default);
        Task<HostDashboardStatsDto> GetHostDashboardStatsAsync(string hostId, CancellationToken cancellationToken = default);
    }
}
