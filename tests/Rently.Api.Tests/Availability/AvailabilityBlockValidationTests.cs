using Rently.Application.Services.Availability;

namespace Rently.Api.Tests.Availability;

public class AvailabilityBlockValidationTests
{
    [Fact]
    public void NormalizeDates_StripsTimeComponent()
    {
        var startDate = new DateTime(2026, 6, 1, 17, 0, 0);
        var endDate = new DateTime(2026, 6, 3, 8, 45, 0);

        var normalized = AvailabilityBlockValidation.NormalizeDates(startDate, endDate);

        Assert.Equal(new DateTime(2026, 6, 1), normalized.StartDate);
        Assert.Equal(new DateTime(2026, 6, 3), normalized.EndDate);
    }
}
