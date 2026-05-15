using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class AccommodationConfiguration : IEntityTypeConfiguration<Accommodation>
{
    public void Configure(EntityTypeBuilder<Accommodation> builder)
    {
        builder.Property(accommodation => accommodation.PropertyType).HasConversion<string>();

        builder.HasOne<ApplicationUser>()
            .WithMany(user => user.Accommodations)
            .HasForeignKey(accommodation => accommodation.HostId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(accommodation => accommodation.Address)
            .WithMany(address => address.Accommodations)
            .HasForeignKey(accommodation => accommodation.AddressId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
