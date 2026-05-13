namespace Rently.Application.DTOs
{
    /// <summary>
    /// DTO for user login (request from client)
    /// </summary>
    public class LoginDto
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }
}
