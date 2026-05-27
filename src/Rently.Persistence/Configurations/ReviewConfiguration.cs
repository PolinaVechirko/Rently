using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.HasOne<ApplicationUser>()
            .WithMany(user => user.Reviews)
            .HasForeignKey(review => review.GuestId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(review => review.Accommodation)
            .WithMany(accommodation => accommodation.Reviews)
            .HasForeignKey(review => review.AccommodationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
