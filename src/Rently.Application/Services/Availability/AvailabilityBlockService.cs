using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Availability;

public class AvailabilityBlockService : IAvailabilityBlockService
{
    private readonly ApplicationDbContext _db;
    private readonly AvailabilityBlockRulesService _rulesService;

    public AvailabilityBlockService(
        ApplicationDbContext db,
        AvailabilityBlockRulesService rulesService)
    {
        _db = db;
        _rulesService = rulesService;
    }

    public async Task<IReadOnlyList<AvailabilityBlock>?> GetBlocksAsync(string hostId, int accommodationId, CancellationToken cancellationToken = default)
    {
        var accommodationExists = await _rulesService.HostOwnsAccommodationAsync(hostId, accommodationId, cancellationToken);
        if (!accommodationExists)
        {
            return null;
        }

        return await _db.AvailabilityBlocks
            .AsNoTracking()
            .Where(block => block.AccommodationId == accommodationId)
            .OrderByDescending(block => block.StartDate)
            .ToListAsync(cancellationToken);
    }

    public async Task<AvailabilityBlock?> CreateBlockAsync(string hostId, int accommodationId, CreateAvailabilityBlockDto dto, CancellationToken cancellationToken = default)
    {
        var accommodationExists = await _rulesService.HostOwnsAccommodationAsync(hostId, accommodationId, cancellationToken);
        if (!accommodationExists)
        {
            return null;
        }

        var (startDate, endDate) = AvailabilityBlockValidation.NormalizeDates(dto.StartDate, dto.EndDate);

        await _rulesService.EnsureNoConfirmedBookingOverlapAsync(accommodationId, startDate, endDate, cancellationToken);
        await _rulesService.CancelOverlappingPendingBookingsAsync(accommodationId, startDate, endDate, cancellationToken);

        var block = new AvailabilityBlock
        {
            AccommodationId = accommodationId,
            StartDate = startDate,
            EndDate = endDate,
            Note = dto.Note,
            CreatedAt = DateTime.UtcNow
        };

        _db.AvailabilityBlocks.Add(block);
        await _db.SaveChangesAsync(cancellationToken);

        return block;
    }

    public async Task<bool?> DeleteBlockAsync(string hostId, int accommodationId, int blockId, CancellationToken cancellationToken = default)
    {
        var accommodationExists = await _rulesService.HostOwnsAccommodationAsync(hostId, accommodationId, cancellationToken);
        if (!accommodationExists)
        {
            return null;
        }

        var block = await _db.AvailabilityBlocks
            .FirstOrDefaultAsync(existingBlock => existingBlock.Id == blockId && existingBlock.AccommodationId == accommodationId, cancellationToken);

        if (block == null)
        {
            return false;
        }

        _db.AvailabilityBlocks.Remove(block);
        await _db.SaveChangesAsync(cancellationToken);

        return true;
    }
}
