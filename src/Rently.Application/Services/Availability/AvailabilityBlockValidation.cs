namespace Rently.Application.Services.Availability;

internal static class AvailabilityBlockValidation
{
    public static (DateTime StartDate, DateTime EndDate) NormalizeDates(DateTime startDate, DateTime endDate)
    {
        return (startDate.Date, endDate.Date);
    }
}
