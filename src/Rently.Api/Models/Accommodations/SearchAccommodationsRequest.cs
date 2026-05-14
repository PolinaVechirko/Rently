using Microsoft.AspNetCore.Mvc;
using Rently.Application.DTOs;

namespace Rently.Api.Models.Accommodations;

public class SearchAccommodationsRequest
{
    public string? SortBy { get; set; }
    public int Limit { get; set; } = 48;
    public int Skip { get; set; }
    public string? Location { get; set; }

    [FromQuery(Name = "types")]
    public string? TypesCsv { get; set; }

    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int? Rooms { get; set; }
    public int? Beds { get; set; }
    public int? Guests { get; set; }

    [FromQuery(Name = "amenities")]
    public string? AmenitiesCsv { get; set; }

    public string? CheckIn { get; set; }
    public string? CheckOut { get; set; }

    public AccommodationSearchQueryDto ToQueryDto()
    {
        return new AccommodationSearchQueryDto
        {
            SortBy = SortBy,
            Limit = Limit,
            Skip = Skip,
            Location = Location,
            TypesCsv = TypesCsv,
            MinPrice = MinPrice,
            MaxPrice = MaxPrice,
            Rooms = Rooms,
            Beds = Beds,
            Guests = Guests,
            AmenitiesCsv = AmenitiesCsv,
            CheckIn = AccommodationRequestDateParser.ParseDateOrNull(CheckIn),
            CheckOut = AccommodationRequestDateParser.ParseDateOrNull(CheckOut)
        };
    }
}
