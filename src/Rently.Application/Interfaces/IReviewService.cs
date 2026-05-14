using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IReviewService
    {
        Task<ReviewEligibilityDto> GetEligibilityAsync(string guestId, int accommodationId);
        Task<ReviewDto> UpsertReviewAsync(string guestId, CreateReviewDto dto);
        Task<ReviewReplyResultDto?> ReplyAsync(string hostId, int reviewId, ReviewReplyDto dto);
    }
}
