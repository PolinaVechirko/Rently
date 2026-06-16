using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Persistence;

namespace Rently.Persistence.Configurations;

internal class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.Property(user => user.Role).HasConversion<string>();
        builder.Property(user => user.FullName).HasMaxLength(100);
        builder.Property(user => user.Email).HasMaxLength(254);
        builder.Property(user => user.NormalizedEmail).HasMaxLength(254);
        builder.ToTable(tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_AspNetUsers_FullName_Length",
                "length(\"FullName\") <= 100");
            tableBuilder.HasCheckConstraint(
                "CK_AspNetUsers_Email_Length",
                "\"Email\" IS NULL OR length(\"Email\") <= 254");
            tableBuilder.HasCheckConstraint(
                "CK_AspNetUsers_NormalizedEmail_Length",
                "\"NormalizedEmail\" IS NULL OR length(\"NormalizedEmail\") <= 254");
        });
        builder.HasIndex(user => user.PhoneNumber).IsUnique();
    }
}
