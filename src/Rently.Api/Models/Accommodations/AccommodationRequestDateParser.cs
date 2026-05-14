using System;
using System.Globalization;

namespace Rently.Api.Models.Accommodations;

internal static class AccommodationRequestDateParser
{
    private static readonly string[] SupportedFormats =
    {
        "yyyy-MM-dd",
        "dd.MM.yyyy",
        "d.M.yyyy",
        "dd/MM/yyyy",
        "d/M/yyyy"
    };

    public static DateTime? ParseDateOrNull(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var normalizedValue = value.Trim();

        if (DateTime.TryParseExact(
                normalizedValue,
                SupportedFormats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out var exactDate))
        {
            return exactDate.Date;
        }

        if (DateTime.TryParse(
                normalizedValue,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out var parsedDate))
        {
            return parsedDate.Date;
        }

        return null;
    }
}
