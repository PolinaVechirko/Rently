using Rently.Application.DTOs;
using Rently.Domain.Entities;
using Rently.Persistence;

namespace Rently.Application.Mappers;

internal static class ReviewMapper
{
    public static ReviewDto ToDto(Review review, ApplicationUser? reviewer)
    {
        return new ReviewDto
        {
            Id = review.Id,
            ReviewerName = reviewer?.FullName ?? "Anonymous",
            ReviewerAvatarUrl = reviewer?.ProfilePhotoUrl ?? UserMapper.DefaultAvatarUrl,
            Rating = review.Rating,
            Comment = review.Comment,
            HostReply = review.HostReply,
            HostReplyCreatedAt = review.HostReplyCreatedAt,
            CreatedAt = review.CreatedAt
        };
    }
}
