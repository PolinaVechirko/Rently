namespace Rently.Domain.Entities
{
    public enum UserRole
    {
        Guest,
        Host,
        Both
    }

    public enum PropertyType
    {
        Apartment,
        House,
        Room,
        Studio,
        Condo,
        Townhouse,
        Guesthouse,
        Villa,
        Cottage,
        Bungalow,
        Cabin,
        Chalet,
        Hotel,
        Hostel,
        Motel,
        Resort,
        Homestay,
        Aparthotel,
        FarmStay,
        EcoHouse,
        TinyHouse,
        BeachHouse,
        LakeHouse,
        WaterfrontApartment,
        Houseboat
    }

    public enum BookingStatus
    {
        Pending,
        Confirmed,
        Cancelled
    }
}
