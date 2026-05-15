using Rently.Application.Exceptions;
using Rently.Application.Services.Reviews;
using Rently.Domain.Entities;

namespace Rently.Api.Tests.Reviews;

public class ReviewValidationTests
{
    [Fact]
    public void NormalizeComment_TrimmedComment_ReturnsTrimmedValue()
    {
        var result = ReviewValidation.NormalizeComment("  Great stay!  ");

        Assert.Equal("Great stay!", result);
    }

    [Fact]
    public void NormalizeComment_WhitespaceComment_ReturnsEmptyString()
    {
        var result = ReviewValidation.NormalizeComment("   ");

        Assert.Equal(string.Empty, result);
    }

    [Fact]
    public void EnsureHostOwnsAccommodation_WrongHost_ThrowsForbiddenException()
    {
        var review = new Review
        {
            Accommodation = new Accommodation
            {
                HostId = "host-1"
            }
        };

        var exception = Assert.Throws<ForbiddenException>(() =>
            ReviewValidation.EnsureHostOwnsAccommodation(review, "host-2"));

        Assert.Equal("You do not have access to this accommodation.", exception.Message);
    }
}
