using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class PhotoConfiguration : IEntityTypeConfiguration<Photo>
{
    public void Configure(EntityTypeBuilder<Photo> builder)
    {
        builder.HasOne(photo => photo.Accommodation)
            .WithMany(accommodation => accommodation.Photos)
            .HasForeignKey(photo => photo.AccommodationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(photo => new { photo.AccommodationId, photo.SortOrder });
    }
}
