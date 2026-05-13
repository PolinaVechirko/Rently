namespace Rently.Domain.Entities
{
    public class AccommodationAmenity
    {
        public int AccommodationId { get; set; }
        public Accommodation? Accommodation { get; set; }

        public int AmenityId { get; set; }
        public Amenity? Amenity { get; set; }
    }
}
