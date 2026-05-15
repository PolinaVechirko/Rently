using Rently.Application.Exceptions;
using Rently.Application.Services.Reviews;
using Rently.Domain.Entities;

namespace Rently.Api.Tests.Reviews;

public class ReviewEligibilityServiceTests
{
    [Fact]
    public async Task GetEligibilityAsync_ConfirmedStartedStayAndExistingReview_ReturnsExistingReviewData()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Bookings.Add(new Booking
        {
            GuestId = "guest-1",
            AccommodationId = 7,
            Status = BookingStatus.Confirmed,
            CheckInDate = DateTime.UtcNow.Date.AddDays(-1),
            CheckOutDate = DateTime.UtcNow.Date.AddDays(2)
        });
        db.Reviews.Add(new Review
        {
            Id = 33,
            GuestId = "guest-1",
            AccommodationId = 7,
            Rating = 5,
            Comment = "Excellent",
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new ReviewEligibilityService(db);

        var result = await service.GetEligibilityAsync("guest-1", 7);

        Assert.True(result.CanReview);
        Assert.True(result.HasExistingReview);
        Assert.Equal(33, result.ReviewId);
        Assert.Equal(5, result.Rating);
        Assert.Equal("Excellent", result.Comment);
    }

    [Fact]
    public async Task EnsureGuestCanReviewAsync_WithoutStartedConfirmedStay_ThrowsForbiddenException()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Bookings.Add(new Booking
        {
            GuestId = "guest-2",
            AccommodationId = 8,
            Status = BookingStatus.Pending,
            CheckInDate = DateTime.UtcNow.Date.AddDays(1),
            CheckOutDate = DateTime.UtcNow.Date.AddDays(3)
        });
        await db.SaveChangesAsync();

        var service = new ReviewEligibilityService(db);

        var exception = await Assert.ThrowsAsync<ForbiddenException>(() =>
            service.EnsureGuestCanReviewAsync("guest-2", 8));

        Assert.Equal("You can review a property only after your confirmed stay has started.", exception.Message);
    }

    [Fact]
    public async Task GetEligibilityAsync_HostReplyOnly_DoesNotPretendGuestHasExistingReview()
    {
        await using var db = TestApplicationDbContextFactory.Create();
        db.Bookings.Add(new Booking
        {
            GuestId = "guest-3",
            AccommodationId = 9,
            Status = BookingStatus.Confirmed,
            CheckInDate = DateTime.UtcNow.Date.AddDays(-2),
            CheckOutDate = DateTime.UtcNow.Date.AddDays(1)
        });
        db.Reviews.Add(new Review
        {
            Id = 44,
            GuestId = "guest-3",
            AccommodationId = 9,
            Rating = 5,
            Comment = "Host reply only marker",
            ParentReviewId = 10,
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var service = new ReviewEligibilityService(db);

        var result = await service.GetEligibilityAsync("guest-3", 9);

        Assert.True(result.CanReview);
        Assert.False(result.HasExistingReview);
        Assert.Null(result.ReviewId);
    }
}
