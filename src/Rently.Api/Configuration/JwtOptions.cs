namespace Rently.Api.Configuration;

public class JwtOptions
{
    public const string SectionName = "Jwt";
    public const string DefaultDevelopmentKey = "your-super-secret-key-change-this-in-production";

    public string Key { get; set; } = DefaultDevelopmentKey;
    public string? Issuer { get; set; }
    public string? Audience { get; set; }
    public int ExpirationMinutes { get; set; } = 60;

    public bool UsesDefaultDevelopmentKey()
    {
        return string.Equals(Key, DefaultDevelopmentKey, StringComparison.Ordinal);
    }

    public string GetSigningKey()
    {
        return Key.Length >= 32
            ? Key
            : $"{Key}-long-enough-now-for-hmacsha256";
    }
}
