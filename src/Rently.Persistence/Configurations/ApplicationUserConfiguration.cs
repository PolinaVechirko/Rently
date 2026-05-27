using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Persistence;

namespace Rently.Persistence.Configurations;

internal class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.Property(user => user.Role).HasConversion<string>();
        builder.HasIndex(user => user.PhoneNumber).IsUnique();
    }
}
