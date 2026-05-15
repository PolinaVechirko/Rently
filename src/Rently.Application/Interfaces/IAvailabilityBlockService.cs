using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Rently.Application.DTOs;
using Rently.Domain.Entities;

namespace Rently.Application.Interfaces
{
    public interface IAvailabilityBlockService
    {
        Task<IReadOnlyList<AvailabilityBlock>?> GetBlocksAsync(string hostId, int accommodationId, CancellationToken cancellationToken = default);
        Task<AvailabilityBlock?> CreateBlockAsync(string hostId, int accommodationId, CreateAvailabilityBlockDto dto, CancellationToken cancellationToken = default);
        Task<bool?> DeleteBlockAsync(string hostId, int accommodationId, int blockId, CancellationToken cancellationToken = default);
    }
}
