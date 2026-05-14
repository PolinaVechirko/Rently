using System;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace Rently.Api.Services
{
    public class ImageService : IImageService
    {
        private static readonly Regex DataUrlRegex = new(
            @"^data:(?<mime>image\/[a-zA-Z0-9.+-]+);base64,(?<data>.+)$",
            RegexOptions.Compiled);

        private readonly IWebHostEnvironment _environment;

        public ImageService(IWebHostEnvironment environment)
        {
            _environment = environment;
        }

        public async Task<ImageUploadResultDto> UploadAccommodationImageAsync(UploadImageRequest request)
        {
            var dataUrl = request?.DataUrl?.Trim() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(dataUrl))
            {
                throw new InvalidOperationException("Image data is required.");
            }

            var match = DataUrlRegex.Match(dataUrl);
            if (!match.Success)
            {
                throw new InvalidOperationException("Invalid image format.");
            }

            var mimeType = match.Groups["mime"].Value.ToLowerInvariant();
            var extension = GetSupportedExtension(mimeType);
            if (extension == null)
            {
                throw new InvalidOperationException("Unsupported image type.");
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
                throw new InvalidOperationException("Could not decode uploaded image.");
            }

            var uploadsFolder = Path.Combine(
                _environment.WebRootPath,
                "uploads",
                "accommodations");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            await File.WriteAllBytesAsync(filePath, bytes);

            return new ImageUploadResultDto
            {
                Url = $"/uploads/accommodations/{fileName}"
            };
        }

        public async Task<ImageContentDto?> GetResizedImageAsync(string url, int width)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return null;
            }

            var filePath = ResolveImagePath(url);
            if (filePath == null || !File.Exists(filePath))
            {
                return null;
            }

            using var image = await Image.LoadAsync(filePath);
            if (width <= 0 || image.Width <= width)
            {
                return new ImageContentDto
                {
                    Content = await File.ReadAllBytesAsync(filePath),
                    ContentType = GetContentTypeFromPath(filePath)
                };
            }

            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Size = new Size(width, 0),
                Mode = ResizeMode.Max
            }));

            await using var output = new MemoryStream();
            await image.SaveAsJpegAsync(output);

            return new ImageContentDto
            {
                Content = output.ToArray(),
                ContentType = "image/jpeg"
            };
        }

        private string? ResolveImagePath(string url)
        {
            var cleanUrl = url.TrimStart('.', '/');
            var filePath = Path.Combine(_environment.WebRootPath, cleanUrl);

            if (File.Exists(filePath))
            {
                return filePath;
            }

            if (Path.IsPathRooted(url) && url.StartsWith(_environment.WebRootPath, StringComparison.Ordinal))
            {
                return url;
            }

            return null;
        }

        private static string? GetSupportedExtension(string mimeType) =>
            mimeType switch
            {
                "image/jpeg" => ".jpg",
                "image/jpg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                _ => null,
            };

        private static string GetContentTypeFromPath(string filePath)
        {
            var extension = Path.GetExtension(filePath).ToLowerInvariant();
            return extension switch
            {
                ".png" => "image/png",
                ".webp" => "image/webp",
                ".jpg" => "image/jpeg",
                ".jpeg" => "image/jpeg",
                _ => "application/octet-stream",
            };
        }
    }
}
