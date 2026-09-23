using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
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

    public async Task<IReadOnlyList<AvailabilityBlockDto>> GetBlocksAsync(string hostId, int accommodationId, CancellationToken cancellationToken = default)
    {
        await _rulesService.EnsureHostOwnsAccommodationAsync(hostId, accommodationId, cancellationToken);

        return await _db.AvailabilityBlocks
            .AsNoTracking()
            .Where(block => block.AccommodationId == accommodationId)
            .OrderByDescending(block => block.StartDate)
            .Select(block => ToDto(block))
            .ToListAsync(cancellationToken);
    }

    public async Task<AvailabilityBlockDto> CreateBlockAsync(string hostId, int accommodationId, CreateAvailabilityBlockDto dto, CancellationToken cancellationToken = default)
    {
        await _rulesService.EnsureHostOwnsAccommodationAsync(hostId, accommodationId, cancellationToken);

        var startDate = dto.StartDate.Date;
        var endDate = dto.EndDate.Date;

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

        return ToDto(block);
    }

    public async Task DeleteBlockAsync(string hostId, int accommodationId, int blockId, CancellationToken cancellationToken = default)
    {
        await _rulesService.EnsureHostOwnsAccommodationAsync(hostId, accommodationId, cancellationToken);

        var block = await _db.AvailabilityBlocks
            .FirstOrDefaultAsync(existingBlock => existingBlock.Id == blockId && existingBlock.AccommodationId == accommodationId, cancellationToken)
            ?? throw new NotFoundException("Blocked dates not found.");

        _db.AvailabilityBlocks.Remove(block);
        await _db.SaveChangesAsync(cancellationToken);
    }

    private static AvailabilityBlockDto ToDto(AvailabilityBlock block)
    {
        return new AvailabilityBlockDto
        {
            Id = block.Id,
            AccommodationId = block.AccommodationId,
            StartDate = block.StartDate,
            EndDate = block.EndDate,
            Note = block.Note,
            CreatedAt = block.CreatedAt
        };
    }
}
