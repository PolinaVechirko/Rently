using System.Text;

namespace Rently.Api.Configuration;

public class JwtOptions
{
    public const string SectionName = "Jwt";
    // HMAC-SHA256 needs a key of at least 256 bits.
    public const int MinimumKeyBytes = 32;
    public const string DefaultDevelopmentKey = "your-super-secret-key-change-this-in-production";

    public string Key { get; set; } = DefaultDevelopmentKey;
    public string? Issuer { get; set; }
    public string? Audience { get; set; }
    public int ExpirationMinutes { get; set; } = 60;

    public bool UsesDefaultDevelopmentKey()
    {
        return string.Equals(Key, DefaultDevelopmentKey, StringComparison.Ordinal);
    }

    public bool HasValidKeyLength()
    {
        return !string.IsNullOrEmpty(Key) && Encoding.UTF8.GetByteCount(Key) >= MinimumKeyBytes;
    }
}
