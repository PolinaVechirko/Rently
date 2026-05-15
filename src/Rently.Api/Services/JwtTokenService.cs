using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Rently.Api.Configuration;
using Rently.Application.Interfaces;
using Rently.Persistence;

namespace Rently.Api.Services;

public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _jwtOptions;

    public JwtTokenService(IOptions<JwtOptions> jwtOptions)
    {
        _jwtOptions = jwtOptions.Value;
    }

    public string CreateToken(ApplicationUser user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var signingKey = Encoding.UTF8.GetBytes(_jwtOptions.GetSigningKey());

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email!),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            ]),
            Expires = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpirationMinutes),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(signingKey),
                SecurityAlgorithms.HmacSha256Signature)
        };

        if (!string.IsNullOrWhiteSpace(_jwtOptions.Issuer))
        {
            tokenDescriptor.Issuer = _jwtOptions.Issuer;
        }

        if (!string.IsNullOrWhiteSpace(_jwtOptions.Audience))
        {
            tokenDescriptor.Audience = _jwtOptions.Audience;
        }

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
