using Rently.Application.DTOs;

namespace Rently.Application.Interfaces;

public interface IAvailabilityBlockService
{
    Task<IReadOnlyList<AvailabilityBlockDto>> GetBlocksAsync(string hostId, int accommodationId, CancellationToken cancellationToken = default);
    Task<AvailabilityBlockDto> CreateBlockAsync(string hostId, int accommodationId, CreateAvailabilityBlockDto dto, CancellationToken cancellationToken = default);
    Task DeleteBlockAsync(string hostId, int accommodationId, int blockId, CancellationToken cancellationToken = default);
}
