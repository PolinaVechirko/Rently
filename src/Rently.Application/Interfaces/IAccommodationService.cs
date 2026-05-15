using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IAccommodationService
    {
        Task<IEnumerable<AccommodationDto>> GetAllAccommodationsAsync(
            AccommodationListQueryDto query,
            CancellationToken cancellationToken = default);

        Task<PagedResultDto<AccommodationDto>> SearchAccommodationsAsync(
            AccommodationSearchQueryDto query,
            CancellationToken cancellationToken = default);

        Task<IReadOnlyList<AccommodationDto>> GetHomepageHighestRatedAsync(int count = 16, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<AccommodationDto>> GetHomepageMostVisitedAsync(int count = 16, int skip = 0, CancellationToken cancellationToken = default);
        Task<AccommodationDto?> GetAccommodationByIdAsync(int id, CancellationToken cancellationToken = default);
        Task<AccommodationDto> CreateAccommodationAsync(string hostId, CreateAccommodationDto dto, CancellationToken cancellationToken = default);
        Task<bool> DeleteAccommodationAsync(int id, string hostId, CancellationToken cancellationToken = default);
        Task<IEnumerable<string>> GetUniqueLocationsAsync(CancellationToken cancellationToken = default);
        Task<IEnumerable<AccommodationDto>> GetHostAccommodationsAsync(string hostId, CancellationToken cancellationToken = default);
        Task<AccommodationDto?> UpdateAccommodationAsync(int id, string hostId, UpdateAccommodationDto dto, CancellationToken cancellationToken = default);
    }
}
