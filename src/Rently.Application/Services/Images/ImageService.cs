using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Options;
using Rently.Application.Configuration;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
using Rently.Application.Interfaces;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace Rently.Application.Services.Images;

public class ImageService : IImageService
{
    private static readonly Regex DataUrlRegex = new(
        @"^data:(?<mime>image\/[a-zA-Z0-9.+-]+);base64,(?<data>.+)$",
        RegexOptions.Compiled);

    private const int MaxResizeWidth = 2400;

    private readonly IWebHostEnvironment _environment;
    private readonly ImageUploadOptions _imageUploadOptions;

    public ImageService(IWebHostEnvironment environment, IOptions<ImageUploadOptions> imageUploadOptions)
    {
        _environment = environment;
        _imageUploadOptions = imageUploadOptions.Value;
    }

    public async Task<ImageUploadResultDto> UploadAccommodationImageAsync(UploadImageRequest request, CancellationToken cancellationToken = default)
    {
        var dataUrl = request?.DataUrl?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(dataUrl))
        {
            throw new AppValidationException("Image data is required.");
        }

        var match = DataUrlRegex.Match(dataUrl);
        if (!match.Success)
        {
            throw new AppValidationException("Invalid image format.");
        }

        var mimeType = match.Groups["mime"].Value.ToLowerInvariant();
        var extension = GetSupportedExtension(mimeType);
        if (extension == null)
        {
            throw new AppValidationException("Unsupported image type.");
        }

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(match.Groups["data"].Value);
            if (bytes.Length > _imageUploadOptions.MaxBytes)
            {
                throw new AppValidationException("Image exceeds the maximum allowed size.");
            }

            await using var stream = new MemoryStream(bytes);
            using var image = await Image.LoadAsync(stream, cancellationToken);
            if (image.Width > _imageUploadOptions.MaxWidth || image.Height > _imageUploadOptions.MaxHeight)
            {
                throw new AppValidationException("Image dimensions exceed the maximum allowed size.");
            }
        }
        catch (AppValidationException)
        {
            throw;
        }
        catch
        {
            throw new AppValidationException("Could not decode uploaded image.");
        }

        var uploadsFolder = Path.Combine(
            _environment.WebRootPath,
            "uploads",
            "accommodations");
        Directory.CreateDirectory(uploadsFolder);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(uploadsFolder, fileName);

        await File.WriteAllBytesAsync(filePath, bytes, cancellationToken);

        return new ImageUploadResultDto
        {
            Url = $"/uploads/accommodations/{fileName}"
        };
    }

    public async Task<ImageContentDto?> GetResizedImageAsync(string url, int width, int? quality = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        var filePath = ResolveImagePath(url);
        if (filePath == null)
        {
            return null;
        }

        Image image;
        try
        {
            image = await Image.LoadAsync(filePath, cancellationToken);
        }
        catch (ImageFormatException)
        {
            return null;
        }

        using (image)
        {
            var targetWidth = Math.Min(width, MaxResizeWidth);
            var shouldResize = targetWidth > 0 && image.Width > targetWidth;
            var normalizedQuality = NormalizeImageQuality(quality);

            if (!shouldResize && normalizedQuality == null)
            {
                return new ImageContentDto
                {
                    Content = await File.ReadAllBytesAsync(filePath, cancellationToken),
                    ContentType = GetContentTypeFromPath(filePath)
                };
            }

            if (shouldResize)
            {
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(targetWidth, 0),
                    Mode = ResizeMode.Max
                }));
            }

            await using var output = new MemoryStream();
            if (normalizedQuality != null)
            {
                await image.SaveAsJpegAsync(
                    output,
                    new JpegEncoder { Quality = normalizedQuality.Value },
                    cancellationToken);

                return new ImageContentDto
                {
                    Content = output.ToArray(),
                    ContentType = "image/jpeg"
                };
            }

            var format = image.Metadata.DecodedImageFormat ?? JpegFormat.Instance;
            await image.SaveAsync(output, format, cancellationToken);

            return new ImageContentDto
            {
                Content = output.ToArray(),
                ContentType = format.DefaultMimeType
            };
        }
    }

    private static int? NormalizeImageQuality(int? quality)
    {
        if (!quality.HasValue)
        {
            return null;
        }

        return Math.Clamp(quality.Value, 40, 95);
    }

    private string? ResolveImagePath(string url)
    {
        var webRootPath = Path.GetFullPath(_environment.WebRootPath);
        var webRootWithSeparator = webRootPath.EndsWith(Path.DirectorySeparatorChar)
            ? webRootPath
            : webRootPath + Path.DirectorySeparatorChar;

        var relativePath = url.TrimStart('.', '/', '\\');
        var filePath = Path.GetFullPath(Path.Combine(webRootPath, relativePath));

        if (!filePath.StartsWith(webRootWithSeparator, StringComparison.Ordinal))
        {
            return null;
        }

        return File.Exists(filePath) ? filePath : null;
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
