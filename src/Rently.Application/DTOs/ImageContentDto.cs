namespace Rently.Application.DTOs
{
    public class ImageContentDto
    {
        public byte[] Content { get; set; } = [];
        public string ContentType { get; set; } = "image/jpeg";
    }
}
