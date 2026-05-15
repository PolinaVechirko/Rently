using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class AvailabilityBlockConfiguration : IEntityTypeConfiguration<AvailabilityBlock>
{
    public void Configure(EntityTypeBuilder<AvailabilityBlock> builder)
    {
        builder.HasOne(block => block.Accommodation)
            .WithMany()
            .HasForeignKey(block => block.AccommodationId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
