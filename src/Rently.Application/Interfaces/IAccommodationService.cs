using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IAccommodationService
    {
        Task<IEnumerable<AccommodationDto>> GetAllAccommodationsAsync(
            string? sortBy = null, 
            int limit = 100, 
            int skip = 0,
            string? location = null,
            string? type = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            int? rooms = null,
            int? beds = null,
            int? amenityId = null,
            DateTime? checkIn = null,
            DateTime? checkOut = null);

        Task<PagedResultDto<AccommodationDto>> SearchAccommodationsAsync(
            string? sortBy = null,
            int limit = 48,
            int skip = 0,
            string? location = null,
            string? typesCsv = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            int? rooms = null,
            int? beds = null,
            int? guests = null,
            string? amenitiesCsv = null,
            DateTime? checkIn = null,
            DateTime? checkOut = null);

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
