using Rently.Application.Exceptions;
using Rently.Domain.Entities;

namespace Rently.Application.Services.Reviews;

internal static class ReviewValidation
{
    public static string NormalizeComment(string? comment)
    {
        return string.IsNullOrWhiteSpace(comment) ? string.Empty : comment.Trim();
    }

    public static void EnsureHostOwnsAccommodation(Review review, string hostId)
    {
        if (review.Accommodation == null || review.Accommodation.HostId != hostId)
        {
            throw new ForbiddenException("You do not have access to this accommodation.");
        }
    }
}
