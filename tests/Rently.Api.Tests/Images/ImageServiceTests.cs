using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Rently.Application.Configuration;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
using Rently.Application.Services.Images;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace Rently.Api.Tests.Images;

public class ImageServiceTests
{
    [Fact]
    public async Task UploadAccommodationImageAsync_ImageExceedsMaxBytes_ThrowsValidationException()
    {
        var environment = CreateEnvironment();
        var service = new ImageService(
            environment,
            Options.Create(new ImageUploadOptions
            {
                MaxBytes = 10,
                MaxWidth = 4096,
                MaxHeight = 4096
            }));

        var request = new UploadImageRequest
        {
            DataUrl = $"data:image/png;base64,{Convert.ToBase64String(CreatePngBytes(32, 32))}"
        };

        var exception = await Assert.ThrowsAsync<AppValidationException>(() =>
            service.UploadAccommodationImageAsync(request));

        Assert.Equal("Image exceeds the maximum allowed size.", exception.Message);
    }

    [Fact]
    public async Task UploadAccommodationImageAsync_ImageExceedsMaxDimensions_ThrowsValidationException()
    {
        var environment = CreateEnvironment();
        var service = new ImageService(
            environment,
            Options.Create(new ImageUploadOptions
            {
                MaxBytes = 5 * 1024 * 1024,
                MaxWidth = 16,
                MaxHeight = 16
            }));

        var request = new UploadImageRequest
        {
            DataUrl = $"data:image/png;base64,{Convert.ToBase64String(CreatePngBytes(32, 32))}"
        };

        var exception = await Assert.ThrowsAsync<AppValidationException>(() =>
            service.UploadAccommodationImageAsync(request));

        Assert.Equal("Image dimensions exceed the maximum allowed size.", exception.Message);
    }

    private static byte[] CreatePngBytes(int width, int height)
    {
        using var image = new Image<Rgba32>(width, height, new Rgba32(10, 20, 30, 255));
        using var stream = new MemoryStream();
        image.SaveAsPng(stream);
        return stream.ToArray();
    }

    private static IWebHostEnvironment CreateEnvironment()
    {
        var root = Path.Combine(Path.GetTempPath(), $"rently-image-tests-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);

        return new TestWebHostEnvironment
        {
            ApplicationName = "Rently.Api.Tests",
            EnvironmentName = "Testing",
            WebRootPath = root,
            ContentRootPath = root,
            WebRootFileProvider = new PhysicalFileProvider(root),
            ContentRootFileProvider = new PhysicalFileProvider(root)
        };
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = string.Empty;
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = string.Empty;
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
