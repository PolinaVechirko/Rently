using Microsoft.AspNetCore.Mvc;
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
            catch (Exception ex)
            {
                return StatusCode(500, "Image processing failed");
            }
        }
    }
}
