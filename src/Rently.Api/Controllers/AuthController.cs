using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Rently.Api.Abstractions;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;

namespace Rently.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly ICurrentUserService _currentUser;

        public AuthController(IAuthService authService, ICurrentUserService currentUser)
        {
            _authService = authService;
            _currentUser = currentUser;
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto, CancellationToken cancellationToken)
        {
            var response = await _authService.RegisterAsync(dto, cancellationToken);
            return Ok(response);
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto, CancellationToken cancellationToken)
        {
            var response = await _authService.LoginAsync(dto, cancellationToken);
            return Ok(response);
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<UserInfoDto>> GetCurrentUser(CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var userInfo = await _authService.GetUserInfoAsync(userId, cancellationToken);
            if (userInfo == null) return NotFound();

            return Ok(userInfo);
        }

        [HttpPut("me")]
        [Authorize]
        public async Task<ActionResult<UserInfoDto>> UpdateCurrentUser([FromBody] UpdateProfileDto dto, CancellationToken cancellationToken)
        {
            var userId = _currentUser.GetRequiredUserId();
            var userInfo = await _authService.UpdateProfileAsync(userId, dto, cancellationToken);
            return Ok(userInfo);
        }
    }
}
