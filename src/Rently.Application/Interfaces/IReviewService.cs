using System.Threading;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IReviewService
    {
        Task<ReviewEligibilityDto> GetEligibilityAsync(string guestId, int accommodationId, CancellationToken cancellationToken = default);
        Task<ReviewDto> UpsertReviewAsync(string guestId, CreateReviewDto dto, CancellationToken cancellationToken = default);
        Task<ReviewReplyResultDto?> ReplyAsync(string hostId, int reviewId, ReviewReplyDto dto, CancellationToken cancellationToken = default);
    }
}
