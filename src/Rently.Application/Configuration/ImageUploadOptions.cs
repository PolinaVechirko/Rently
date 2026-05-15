namespace Rently.Application.Configuration;

public class ImageUploadOptions
{
    public const string SectionName = "ImageUpload";

    public int MaxBytes { get; set; } = 5 * 1024 * 1024;
    public int MaxWidth { get; set; } = 4096;
    public int MaxHeight { get; set; } = 4096;
}
