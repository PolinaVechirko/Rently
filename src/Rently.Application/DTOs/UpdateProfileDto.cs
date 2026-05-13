namespace Rently.Application.DTOs
{
    public class UpdateProfileDto
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Bio { get; set; }
        public string? PhoneNumber { get; set; }
        public string? ProfilePhotoUrl { get; set; }
    }
}