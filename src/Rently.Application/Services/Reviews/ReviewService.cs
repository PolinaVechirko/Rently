using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Services.Reviews;

public class ReviewService : IReviewService
{
    private readonly ApplicationDbContext _db;
    private readonly ReviewEligibilityService _eligibilityService;

    public ReviewService(ApplicationDbContext db, ReviewEligibilityService eligibilityService)
    {
        _db = db;
        _eligibilityService = eligibilityService;
    }

    public async Task<ReviewEligibilityDto> GetEligibilityAsync(string guestId, int accommodationId, CancellationToken cancellationToken = default)
    {
        return await _eligibilityService.GetEligibilityAsync(guestId, accommodationId, cancellationToken);
    }

    public async Task<ReviewDto> UpsertReviewAsync(string guestId, CreateReviewDto dto, CancellationToken cancellationToken = default)
    {
        await _eligibilityService.EnsureGuestCanReviewAsync(guestId, dto.AccommodationId, cancellationToken);

        var review = await _db.Reviews
            .Include(existingReview => existingReview.Accommodation)
            .FirstOrDefaultAsync(existingReview =>
                existingReview.GuestId == guestId &&
                existingReview.AccommodationId == dto.AccommodationId &&
                existingReview.ParentReviewId == null, cancellationToken);

        if (review == null)
        {
            review = new Review
            {
                GuestId = guestId,
                AccommodationId = dto.AccommodationId,
                Rating = dto.Rating,
                Comment = ReviewValidation.NormalizeComment(dto.Comment),
                CreatedAt = DateTime.UtcNow
            };

            _db.Reviews.Add(review);
        }
        else
        {
            review.Rating = dto.Rating;
            review.Comment = ReviewValidation.NormalizeComment(dto.Comment);
        }

        await _db.SaveChangesAsync(cancellationToken);

        var reviewer = await _db.Users
            .AsNoTracking()
            .Where(user => user.Id == guestId)
            .Select(user => new
            {
                user.FullName,
                user.ProfilePhotoUrl
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new ReviewDto
        {
            Id = review.Id,
            ReviewerName = reviewer?.FullName ?? "Anonymous",
            ReviewerAvatarUrl = reviewer?.ProfilePhotoUrl ?? "/icons/user.svg",
            Rating = review.Rating,
            Comment = review.Comment,
            HostReply = review.HostReply,
            HostReplyCreatedAt = review.HostReplyCreatedAt,
            CreatedAt = review.CreatedAt
        };
    }

    public async Task<ReviewReplyResultDto?> ReplyAsync(string hostId, int reviewId, ReviewReplyDto dto, CancellationToken cancellationToken = default)
    {
        var review = await _db.Reviews
            .Include(existingReview => existingReview.Accommodation)
            .FirstOrDefaultAsync(existingReview => existingReview.Id == reviewId, cancellationToken);

        if (review == null)
        {
            return null;
        }

        ReviewValidation.EnsureHostOwnsAccommodation(review, hostId);

        review.HostReply = dto.Reply?.Trim();
        review.HostReplyCreatedAt = string.IsNullOrWhiteSpace(review.HostReply)
            ? null
            : DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return new ReviewReplyResultDto
        {
            Id = review.Id,
            HostReply = review.HostReply,
            HostReplyCreatedAt = review.HostReplyCreatedAt
        };
    }
}
