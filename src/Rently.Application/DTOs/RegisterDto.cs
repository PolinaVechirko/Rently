namespace Rently.Application.DTOs
{
    /// <summary>
    /// DTO for user registration (request from client)
    /// </summary>
    public class RegisterDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = "Guest"; // "Host" or "Guest"
    }
}
