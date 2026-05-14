using Rently.Application.DTOs;

namespace Rently.Api.Models.Accommodations;

public class GetAccommodationsRequest
{
    public string? SortBy { get; set; }
    public int Limit { get; set; } = 100;
    public int Skip { get; set; }
    public string? Location { get; set; }
    public string? Type { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? Rooms { get; set; }
    public int? Beds { get; set; }
    public int? AmenityId { get; set; }
    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }

    public AccommodationListQueryDto ToQueryDto()
    {
        return new AccommodationListQueryDto
        {
            SortBy = SortBy,
            Limit = Limit,
            Skip = Skip,
            Location = Location,
            Type = Type,
            MinPrice = MinPrice,
            MaxPrice = MaxPrice,
            Rooms = Rooms,
            Beds = Beds,
            AmenityId = AmenityId,
            CheckIn = AccommodationRequestDateParser.ParseDateOrNull(CheckIn),
            CheckOut = AccommodationRequestDateParser.ParseDateOrNull(CheckOut)
        };
    }
}
