using Rently.Application.Services.Accommodations;
using Rently.Domain.Entities;

namespace Rently.Api.Tests.Accommodations;

public class AccommodationSortingTests
{
    [Fact]
    public void ApplySearchSorting_HighestRated_UsesWeightedRatingInsteadOfRawAverage()
    {
        var singleFiveStar = CreateAccommodation(
            id: 1,
            ratings: [5]);
        var wellReviewedStrongRating = CreateAccommodation(
            id: 2,
            ratings: [5, 5, 5, 5, 4, 4, 5, 5]);
        var baselineListing = CreateAccommodation(
            id: 3,
            ratings: [4, 4, 4]);

        var sorted = AccommodationSorting.ApplySearchSorting(
                [singleFiveStar, wellReviewedStrongRating, baselineListing],
                "highest_rated")
            .ToList();

        Assert.Equal(2, sorted[0].Id);
        Assert.Equal(1, sorted[1].Id);
        Assert.Equal(3, sorted[2].Id);
    }

    private static Accommodation CreateAccommodation(int id, int[] ratings)
    {
        return new Accommodation
        {
            Id = id,
            Title = $"Accommodation {id}",
            HostId = $"host-{id}",
            AddressId = id,
            Reviews = ratings
                .Select((rating, index) => new Review
                {
                    Id = index + 1,
                    Rating = rating,
                    GuestId = $"guest-{id}-{index}"
                })
                .ToList()
        };
    }
}
