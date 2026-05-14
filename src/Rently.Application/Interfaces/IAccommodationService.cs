using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IAccommodationService
    {
        Task<IEnumerable<AccommodationDto>> GetAllAccommodationsAsync(AccommodationListQueryDto query);

        Task<PagedResultDto<AccommodationDto>> SearchAccommodationsAsync(AccommodationSearchQueryDto query);

        Task<IReadOnlyList<AccommodationDto>> GetHomepageHighestRatedAsync(int count = 16);
        Task<IReadOnlyList<AccommodationDto>> GetHomepageMostVisitedAsync(int count = 16, int skip = 0);
        Task<AccommodationDto?> GetAccommodationByIdAsync(int id);
        Task<AccommodationDto> CreateAccommodationAsync(string hostId, CreateAccommodationDto dto);
        Task<bool> DeleteAccommodationAsync(int id, string hostId);
        Task<IEnumerable<string>> GetUniqueLocationsAsync();
        Task<IEnumerable<AccommodationDto>> GetHostAccommodationsAsync(string hostId);
        Task<AccommodationDto?> UpdateAccommodationAsync(int id, string hostId, UpdateAccommodationDto dto);
    }
}
