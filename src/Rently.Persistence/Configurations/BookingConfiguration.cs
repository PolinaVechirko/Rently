using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.Property(booking => booking.Status).HasConversion<string>();

        builder.HasOne<ApplicationUser>()
            .WithMany(user => user.Bookings)
            .HasForeignKey(booking => booking.GuestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(booking => booking.Accommodation)
            .WithMany(accommodation => accommodation.Bookings)
            .HasForeignKey(booking => booking.AccommodationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
