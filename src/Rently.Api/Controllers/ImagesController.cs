using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImagesController : ControllerBase
    {
        private readonly IImageService _imageService;

        public ImagesController(IImageService imageService)
        {
            _imageService = imageService;
        }

        [HttpPost("upload")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<ImageUploadResultDto>> UploadImage([FromBody] UploadImageRequest request, CancellationToken cancellationToken)
        {
            var result = await _imageService.UploadAccommodationImageAsync(request, cancellationToken);
            return Ok(result);
        }

        [HttpGet("resize")]
        public async Task<IActionResult> GetResizedImage([FromQuery] string url, [FromQuery] int width, [FromQuery] int? quality, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return BadRequest();
            }

            var result = await _imageService.GetResizedImageAsync(url, width, quality, cancellationToken);
            if (result == null)
            {
                return NotFound();
            }

            return File(result.Content, result.ContentType);
        }
    }
}
