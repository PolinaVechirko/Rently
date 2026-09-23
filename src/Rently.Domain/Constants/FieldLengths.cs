namespace Rently.Domain.Constants;

/// <summary>
/// Maximum text lengths shared by the database schema and request validation.
/// </summary>
public static class FieldLengths
{
    public const int AccommodationTitle = 100;
    public const int AccommodationDescription = 2000;
    public const int Country = 100;
    public const int City = 100;
    public const int FullName = 100;
    public const int Email = 254;
    public const int ReviewComment = 1000;
    public const int ReviewReply = 1000;
}
