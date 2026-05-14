using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;
using ApplicationUser = Rently.Persistence.ApplicationUser;

namespace Rently.Api.Services;

public class ReviewService : IReviewService
{
    private readonly ApplicationDbContext _db;

    public ReviewService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<ReviewEligibilityDto> GetEligibilityAsync(string guestId, int accommodationId)
    {
        var today = DateTime.UtcNow.Date;
        var hasEligibleBooking = await _db.Bookings.AnyAsync(booking =>
            booking.GuestId == guestId &&
            booking.AccommodationId == accommodationId &&
            booking.Status == BookingStatus.Confirmed &&
            booking.CheckInDate.Date <= today);

        var existingReview = await _db.Reviews
            .AsNoTracking()
            .Where(review =>
                review.GuestId == guestId &&
                review.AccommodationId == accommodationId &&
                review.ParentReviewId == null)
            .OrderByDescending(review => review.CreatedAt)
            .Select(review => new ReviewEligibilityDto
            {
                CanReview = hasEligibleBooking,
                HasExistingReview = true,
                ReviewId = review.Id,
                Rating = review.Rating,
                Comment = review.Comment
            })
            .FirstOrDefaultAsync();

        return existingReview ?? new ReviewEligibilityDto
        {
            CanReview = hasEligibleBooking,
            HasExistingReview = false
        };
    }

    public async Task<ReviewDto> UpsertReviewAsync(string guestId, CreateReviewDto dto)
    {
        ValidateReviewInput(dto);
        await EnsureGuestCanReviewAsync(guestId, dto.AccommodationId);

        var review = await _db.Reviews
            .Include(existingReview => existingReview.Accommodation)
            .FirstOrDefaultAsync(existingReview =>
                existingReview.GuestId == guestId &&
                existingReview.AccommodationId == dto.AccommodationId &&
                existingReview.ParentReviewId == null);

        if (review == null)
        {
            review = new Review
            {
                GuestId = guestId,
                AccommodationId = dto.AccommodationId,
                Rating = dto.Rating,
                Comment = NormalizeComment(dto.Comment),
                CreatedAt = DateTime.UtcNow
            };

            _db.Reviews.Add(review);
        }
        else
        {
            review.Rating = dto.Rating;
            review.Comment = NormalizeComment(dto.Comment);
        }

        await _db.SaveChangesAsync();

        var reviewer = await _db.Users
            .AsNoTracking()
            .Where(user => user.Id == guestId)
            .Select(user => new
            {
                user.FullName,
                user.ProfilePhotoUrl
            })
            .FirstOrDefaultAsync();

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

    public async Task<ReviewReplyResultDto?> ReplyAsync(string hostId, int reviewId, ReviewReplyDto dto)
    {
        var review = await _db.Reviews
            .Include(existingReview => existingReview.Accommodation)
            .FirstOrDefaultAsync(existingReview => existingReview.Id == reviewId);

        if (review == null)
        {
            return null;
        }

        if (review.Accommodation == null || review.Accommodation.HostId != hostId)
        {
            throw new UnauthorizedAccessException();
        }

        review.HostReply = dto.Reply?.Trim();
        review.HostReplyCreatedAt = string.IsNullOrWhiteSpace(review.HostReply)
            ? null
            : DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return new ReviewReplyResultDto
        {
            Id = review.Id,
            HostReply = review.HostReply,
            HostReplyCreatedAt = review.HostReplyCreatedAt
        };
    }

    private async Task EnsureGuestCanReviewAsync(string guestId, int accommodationId)
    {
        var today = DateTime.UtcNow.Date;
        var hasEligibleBooking = await _db.Bookings.AnyAsync(booking =>
            booking.GuestId == guestId &&
            booking.AccommodationId == accommodationId &&
            booking.Status == BookingStatus.Confirmed &&
            booking.CheckInDate.Date <= today);

        if (!hasEligibleBooking)
        {
            throw new UnauthorizedAccessException("You can review a property only after your confirmed stay has started.");
        }
    }

    private static void ValidateReviewInput(CreateReviewDto dto)
    {
        if (dto.Rating < 1 || dto.Rating > 5)
        {
            throw new InvalidOperationException("Rating must be between 1 and 5.");
        }

        if (string.IsNullOrWhiteSpace(dto.Comment))
        {
            throw new InvalidOperationException("Comment cannot be empty.");
        }
    }

    private static string NormalizeComment(string? comment)
    {
        return string.IsNullOrWhiteSpace(comment) ? string.Empty : comment.Trim();
    }
}
