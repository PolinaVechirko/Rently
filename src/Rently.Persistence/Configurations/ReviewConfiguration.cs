using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Constants;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> builder)
    {
        builder.Property(review => review.Comment).HasMaxLength(FieldLengths.ReviewComment);
        builder.Property(review => review.HostReply).HasMaxLength(FieldLengths.ReviewReply);
        builder.ToTable(tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_Reviews_Comment_Length",
                $"\"Comment\" IS NULL OR length(\"Comment\") <= {FieldLengths.ReviewComment}");
            tableBuilder.HasCheckConstraint(
                "CK_Reviews_HostReply_Length",
                $"\"HostReply\" IS NULL OR length(\"HostReply\") <= {FieldLengths.ReviewReply}");
        });

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
