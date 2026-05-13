namespace Rently.Application.DTOs
{
    /// <summary>
    /// DTO for auth response (JWT token and user info)
    /// </summary>
    public class AuthResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Token { get; set; }
        public UserInfoDto? User { get; set; }
    }
}
