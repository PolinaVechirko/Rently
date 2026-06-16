using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class AccommodationConfiguration : IEntityTypeConfiguration<Accommodation>
{
    public void Configure(EntityTypeBuilder<Accommodation> builder)
    {
        builder.Property(accommodation => accommodation.PropertyType).HasConversion<string>();
        builder.Property(accommodation => accommodation.Title).HasMaxLength(100);
        builder.Property(accommodation => accommodation.Description).HasMaxLength(2000);
        builder.ToTable(tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_Accommodations_Title_Length",
                "length(\"Title\") <= 100");
            tableBuilder.HasCheckConstraint(
                "CK_Accommodations_Description_Length",
                "\"Description\" IS NULL OR length(\"Description\") <= 2000");
        });

        builder.HasOne<ApplicationUser>()
            .WithMany(user => user.Accommodations)
            .HasForeignKey(accommodation => accommodation.HostId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(accommodation => accommodation.Address)
            .WithMany(address => address.Accommodations)
            .HasForeignKey(accommodation => accommodation.AddressId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(accommodation => accommodation.CoverPhoto)
            .WithMany()
            .HasForeignKey(accommodation => accommodation.CoverPhotoId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(accommodation => accommodation.CoverPhotoId)
            .IsUnique();
    }
}
