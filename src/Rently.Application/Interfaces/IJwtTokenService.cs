using Rently.Persistence;

namespace Rently.Application.Interfaces;

public interface IJwtTokenService
{
    string CreateToken(ApplicationUser user);
}
