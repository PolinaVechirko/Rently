using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Reviews;

public class ReviewEligibilityService
{
    private readonly ApplicationDbContext _dbContext;

    public ReviewEligibilityService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<ReviewEligibilityDto> GetEligibilityAsync(string guestId, int accommodationId, CancellationToken cancellationToken = default)
    {
        var canReview = await CanGuestReviewAsync(guestId, accommodationId, cancellationToken);

        var existingReview = await _dbContext.Reviews
            .AsNoTracking()
            .Where(review =>
                review.GuestId == guestId &&
                review.AccommodationId == accommodationId &&
                review.ParentReviewId == null)
            .OrderByDescending(review => review.CreatedAt)
            .Select(review => new ReviewEligibilityDto
            {
                CanReview = canReview,
                HasExistingReview = true,
                ReviewId = review.Id,
                Rating = review.Rating,
                Comment = review.Comment
            })
            .FirstOrDefaultAsync(cancellationToken);

        return existingReview ?? new ReviewEligibilityDto
        {
            CanReview = canReview,
            HasExistingReview = false
        };
    }

    public async Task EnsureGuestCanReviewAsync(string guestId, int accommodationId, CancellationToken cancellationToken = default)
    {
        if (!await CanGuestReviewAsync(guestId, accommodationId, cancellationToken))
        {
            throw new ForbiddenException("You can review a property only after your confirmed stay has started.");
        }
    }

    private async Task<bool> CanGuestReviewAsync(string guestId, int accommodationId, CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;

        return await _dbContext.Bookings.AnyAsync(booking =>
            booking.GuestId == guestId &&
            booking.AccommodationId == accommodationId &&
            booking.Status == BookingStatus.Confirmed &&
            booking.CheckInDate.Date <= today, cancellationToken);
    }
}
