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
        public async Task<ActionResult<ImageUploadResultDto>> UploadImage([FromBody] UploadImageRequest request)
        {
            try
            {
                var result = await _imageService.UploadAccommodationImageAsync(request);
                return Ok(result);
            }
            catch (InvalidOperationException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpGet("resize")]
        public async Task<IActionResult> GetResizedImage([FromQuery] string url, [FromQuery] int width)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return BadRequest();
            }

            try
            {
                var result = await _imageService.GetResizedImageAsync(url, width);
                if (result == null)
                {
                    return NotFound();
                }

                return File(result.Content, result.ContentType);
            }
            catch (Exception)
            {
                return StatusCode(500, "Image processing failed");
            }
        }
    }
}
