namespace Rently.Application.DTOs
{
    /// <summary>
    /// DTO for user info (used in responses)
    /// </summary>
    public class UserInfoDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Bio { get; set; }
        public string Role { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? ProfilePhotoUrl { get; set; }
    }
}
