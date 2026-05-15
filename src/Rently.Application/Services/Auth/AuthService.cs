using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Rently.Application.DTOs;
using Rently.Application.Exceptions;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;
using ApplicationUser = Rently.Persistence.ApplicationUser;

namespace Rently.Application.Services.Auth;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IJwtTokenService _jwtTokenService;

    public AuthService(UserManager<ApplicationUser> userManager, IJwtTokenService jwtTokenService)
    {
        _userManager = userManager;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var normalizedEmail = NormalizeEmail(dto.Email);
        var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);
        if (existingUser != null)
        {
            throw new ConflictException("This email is already registered.");
        }

        var user = new ApplicationUser
        {
            UserName = normalizedEmail,
            Email = normalizedEmail,
            FullName = dto.FullName.Trim(),
            Role = ParseUserRole(dto.Role),
            CreatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
        {
            throw new AppValidationException(BuildIdentityErrorMessage("Registration failed", result));
        }

        return await LoginAsync(new LoginDto { Email = dto.Email, Password = dto.Password }, cancellationToken);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await _userManager.FindByEmailAsync(NormalizeEmail(dto.Email));
        if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
        {
            throw new AuthenticationException("Invalid email or password.");
        }

        return new AuthResponseDto
        {
            Token = _jwtTokenService.CreateToken(user),
            User = new UserInfoDto
            {
                Id = user.Id,
                Email = user.Email!,
                FullName = user.FullName,
                Bio = user.Bio,
                Role = user.Role.ToString(),
                ProfilePhotoUrl = user.ProfilePhotoUrl ?? "/icons/user.svg"
            }
        };
    }

    public async Task<UserInfoDto?> GetUserInfoAsync(string userId, CancellationToken cancellationToken = default)
    {
        return await _userManager.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new UserInfoDto
            {
                Id = u.Id,
                Email = u.Email ?? string.Empty,
                FullName = u.FullName,
                Role = u.Role.ToString(),
                PhoneNumber = u.PhoneNumber,
                ProfilePhotoUrl = u.ProfilePhotoUrl ?? "/icons/user.svg",
                Bio = u.Bio
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<UserInfoDto> UpdateProfileAsync(string userId, UpdateProfileDto dto, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            throw new NotFoundException("User not found.");
        }

        var normalizedEmail = NormalizeEmail(dto.Email);
        var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);
        if (existingUser != null && existingUser.Id != user.Id)
        {
            throw new ConflictException("This email is already used by another account.");
        }

        if (!string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
        {
            var emailResult = await _userManager.SetEmailAsync(user, normalizedEmail);
            if (!emailResult.Succeeded)
            {
                throw new AppValidationException(BuildIdentityErrorMessage("Could not update email", emailResult));
            }

            var userNameResult = await _userManager.SetUserNameAsync(user, normalizedEmail);
            if (!userNameResult.Succeeded)
            {
                throw new AppValidationException(BuildIdentityErrorMessage("Could not update username", userNameResult));
            }
        }

        user.FullName = dto.FullName.Trim();
        user.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();
        user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
        user.ProfilePhotoUrl = string.IsNullOrWhiteSpace(dto.ProfilePhotoUrl) ? null : dto.ProfilePhotoUrl.Trim();

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            throw new AppValidationException(BuildIdentityErrorMessage("Could not update profile", updateResult));
        }

        return new UserInfoDto
        {
            Id = user.Id,
            Email = user.Email!,
            FullName = user.FullName,
            Bio = user.Bio,
            Role = user.Role.ToString(),
            PhoneNumber = user.PhoneNumber,
            ProfilePhotoUrl = user.ProfilePhotoUrl
        };
    }

    private static UserRole ParseUserRole(string role)
    {
        return Enum.TryParse<UserRole>(role, true, out var parsedRole)
            ? parsedRole
            : throw new AppValidationException("Role must be Guest, Host, or Both.");
    }

    private static string BuildIdentityErrorMessage(string prefix, IdentityResult result)
    {
        var errors = string.Join(", ", result.Errors.Select(error => error.Description));
        return $"{prefix}: {errors}";
    }

    private static string NormalizeEmail(string email)
    {
        return email.Trim();
    }
}
