using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class FavoriteConfiguration : IEntityTypeConfiguration<Favorite>
{
    public void Configure(EntityTypeBuilder<Favorite> builder)
    {
        builder.HasKey(favorite => new { favorite.UserId, favorite.AccommodationId, favorite.Type });

        builder.HasOne<ApplicationUser>()
            .WithMany(user => user.Favorites)
            .HasForeignKey(favorite => favorite.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(favorite => favorite.Accommodation)
            .WithMany(accommodation => accommodation.FavoritedBy)
            .HasForeignKey(favorite => favorite.AccommodationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
