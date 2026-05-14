using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ImagesController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public ImagesController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpPost("upload")]
        [Authorize(Roles = "Host,Both")]
        public async Task<ActionResult<object>> UploadImage([FromBody] UploadImageRequest request)
        {
            var dataUrl = request?.DataUrl?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(dataUrl))
            {
                return BadRequest(new { message = "Image data is required." });
            }

            var match = System.Text.RegularExpressions.Regex.Match(
                dataUrl,
                @"^data:(?<mime>image\/[a-zA-Z0-9.+-]+);base64,(?<data>.+)$");

            if (!match.Success)
            {
                return BadRequest(new { message = "Invalid image format." });
            }

            var mimeType = match.Groups["mime"].Value.ToLowerInvariant();
            var extension = mimeType switch
            {
                "image/jpeg" => ".jpg",
                "image/jpg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                _ => null,
            };

            if (extension == null)
            {
                return BadRequest(new { message = "Unsupported image type." });
            }

            byte[] bytes;
            try
            {
                bytes = Convert.FromBase64String(match.Groups["data"].Value);
                await using var stream = new MemoryStream(bytes);
                using var _ = await Image.LoadAsync(stream);
            }
            catch
            {
                return BadRequest(new { message = "Could not decode uploaded image." });
            }

            var uploadsFolder = Path.Combine(_env.WebRootPath, "uploads", "accommodations");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            await System.IO.File.WriteAllBytesAsync(filePath, bytes);

            return Ok(new { url = $"/uploads/accommodations/{fileName}" });
        }

        [HttpGet("resize")]
        public async Task<IActionResult> GetResizedImage([FromQuery] string url, [FromQuery] int width)
        {
            if (string.IsNullOrEmpty(url)) return BadRequest();

            try
            {
                // Resolve path (assume url starts with ./images/ or images/)
                var cleanUrl = url.TrimStart('.', '/');
                var filePath = Path.Combine(_env.WebRootPath, cleanUrl);

                if (!System.IO.File.Exists(filePath)) 
                {
                    // Fallback to absolute if it was already absolute but inside webroot
                    if (Path.IsPathRooted(url) && url.StartsWith(_env.WebRootPath))
                        filePath = url;
                    else
                        return NotFound();
                }

                using var image = await Image.LoadAsync(filePath);
                
                // If image is already smaller, just return original to save CPU
                if (image.Width <= width) return PhysicalFile(filePath, "image/jpeg");

                // Resize maintaining aspect ratio
                image.Mutate(x => x.Resize(new ResizeOptions {
                    Size = new Size(width, 0),
                    Mode = ResizeMode.Max
                }));

                var ms = new MemoryStream();
                await image.SaveAsJpegAsync(ms);
                ms.Position = 0;

                return File(ms, "image/jpeg");
            }
            catch (Exception)
            {
                return StatusCode(500, "Image processing failed");
            }
        }
    }

    public class UploadImageRequest
    {
        public string DataUrl { get; set; } = string.Empty;
    }
}
