using System;
using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Rently.Application.DTOs;
using Rently.Application.Interfaces;
using Rently.Domain.Entities;
using Rently.Persistence;
using ApplicationUser = Rently.Persistence.ApplicationUser;

namespace Rently.Api.Services
{
    public class AuthService : IAuthService
    {
        private static readonly EmailAddressAttribute EmailValidator = new();
        private static readonly Regex PhoneValidator = new(@"^\+?[0-9\s\-()]{7,20}$", RegexOptions.Compiled | RegexOptions.CultureInvariant);

        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _configuration;

        public AuthService(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager, IConfiguration configuration)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _configuration = configuration;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
        {
            ValidateEmail(dto.Email);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);
            if (existingUser != null)
            {
                throw new InvalidOperationException("This email is already registered.");
            }

            var user = new ApplicationUser
            {
                UserName = normalizedEmail,
                Email = normalizedEmail,
                Role = Enum.Parse<UserRole>(dto.Role, true), // "Guest" or "Host"
                CreatedAt = DateTime.UtcNow
            };

            var result = await _userManager.CreateAsync(user, dto.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new Exception($"Registration failed: {errors}");
            }

            return await LoginAsync(new LoginDto { Email = dto.Email, Password = dto.Password });
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
        {
            ValidateEmail(dto.Email);

            var user = await _userManager.FindByEmailAsync(NormalizeEmail(dto.Email));
            if (user == null || !await _userManager.CheckPasswordAsync(user, dto.Password))
            {
                throw new UnauthorizedAccessException("Invalid email or password.");
            }

            var tokenHandler = new JwtSecurityTokenHandler();
            var keyStr = _configuration["Jwt:Key"] ?? "your-super-secret-key-change-this-in-production";
            // Ensure key is long enough for HMACSHA256
            if (keyStr.Length < 32)
            {
                keyStr = "your-super-secret-key-change-this-in-production-long-enough-now";
            }
            var key = Encoding.ASCII.GetBytes(keyStr);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, user.Id),
                    new Claim(ClaimTypes.Email, user.Email!),
                    new Claim(ClaimTypes.Role, user.Role.ToString())
                }),
                Expires = DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "60")),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return new AuthResponseDto
            {
                Token = tokenHandler.WriteToken(token),
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

        public async Task<UserInfoDto?> GetUserInfoAsync(string userId)
        {
            var user = await _userManager.Users
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
                .FirstOrDefaultAsync();

            return user;
        }

        public async Task<UserInfoDto> UpdateProfileAsync(string userId, UpdateProfileDto dto)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
            {
                throw new UnauthorizedAccessException("User not found.");
            }

            if (string.IsNullOrWhiteSpace(dto.FullName))
            {
                throw new InvalidOperationException("Full name cannot be empty.");
            }

            ValidateEmail(dto.Email);
            ValidatePhoneNumber(dto.PhoneNumber);

            var normalizedEmail = NormalizeEmail(dto.Email);
            var existingUser = await _userManager.FindByEmailAsync(normalizedEmail);
            if (existingUser != null && existingUser.Id != user.Id)
            {
                throw new InvalidOperationException("This email is already used by another account.");
            }

            if (!string.Equals(user.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            {
                var emailResult = await _userManager.SetEmailAsync(user, normalizedEmail);
                if (!emailResult.Succeeded)
                {
                    var errors = string.Join(", ", emailResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Could not update email: {errors}");
                }

                var userNameResult = await _userManager.SetUserNameAsync(user, normalizedEmail);
                if (!userNameResult.Succeeded)
                {
                    var errors = string.Join(", ", userNameResult.Errors.Select(e => e.Description));
                    throw new InvalidOperationException($"Could not update username: {errors}");
                }
            }

            user.FullName = dto.FullName.Trim();
            user.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();
            user.PhoneNumber = string.IsNullOrWhiteSpace(dto.PhoneNumber) ? null : dto.PhoneNumber.Trim();
            user.ProfilePhotoUrl = string.IsNullOrWhiteSpace(dto.ProfilePhotoUrl) ? null : dto.ProfilePhotoUrl.Trim();

            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                var errors = string.Join(", ", updateResult.Errors.Select(e => e.Description));
                throw new InvalidOperationException($"Could not update profile: {errors}");
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

        private static string NormalizeEmail(string email)
        {
            return email.Trim();
        }

        private static void ValidateEmail(string email)
        {
            if (string.IsNullOrWhiteSpace(email) || !EmailValidator.IsValid(email.Trim()))
            {
                throw new InvalidOperationException("Please enter a valid email address.");
            }
        }

        private static void ValidatePhoneNumber(string? phoneNumber)
        {
            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                return;
            }

            var trimmed = phoneNumber.Trim();
            if (!PhoneValidator.IsMatch(trimmed))
            {
                throw new InvalidOperationException("Please enter a realistic phone number.");
            }

            var digitCount = 0;
            foreach (var ch in trimmed)
            {
                if (char.IsDigit(ch))
                {
                    digitCount++;
                }
            }

            if (digitCount < 7 || digitCount > 15)
            {
                throw new InvalidOperationException("Please enter a realistic phone number.");
            }
        }
    }
}
