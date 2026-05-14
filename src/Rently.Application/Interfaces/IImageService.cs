using System.Threading.Tasks;
using Rently.Application.DTOs;

namespace Rently.Application.Interfaces
{
    public interface IImageService
    {
        Task<ImageUploadResultDto> UploadAccommodationImageAsync(UploadImageRequest request);
        Task<ImageContentDto?> GetResizedImageAsync(string url, int width);
    }
}
