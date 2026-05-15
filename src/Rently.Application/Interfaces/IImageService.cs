using System.Threading;
using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IImageService
    {
        Task<ImageUploadResultDto> UploadAccommodationImageAsync(UploadImageRequest request, CancellationToken cancellationToken = default);
        Task<ImageContentDto?> GetResizedImageAsync(string url, int width, CancellationToken cancellationToken = default);
    }
}
