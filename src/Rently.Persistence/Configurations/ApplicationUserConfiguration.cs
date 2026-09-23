using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Constants;

namespace Rently.Persistence.Configurations;

internal class ApplicationUserConfiguration : IEntityTypeConfiguration<ApplicationUser>
{
    public void Configure(EntityTypeBuilder<ApplicationUser> builder)
    {
        builder.Property(user => user.Role).HasConversion<string>();
        builder.Property(user => user.FullName).HasMaxLength(FieldLengths.FullName);
        builder.Property(user => user.Email).HasMaxLength(FieldLengths.Email);
        builder.Property(user => user.NormalizedEmail).HasMaxLength(FieldLengths.Email);
        builder.ToTable(tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_AspNetUsers_FullName_Length",
                $"length(\"FullName\") <= {FieldLengths.FullName}");
            tableBuilder.HasCheckConstraint(
                "CK_AspNetUsers_Email_Length",
                $"\"Email\" IS NULL OR length(\"Email\") <= {FieldLengths.Email}");
            tableBuilder.HasCheckConstraint(
                "CK_AspNetUsers_NormalizedEmail_Length",
                $"\"NormalizedEmail\" IS NULL OR length(\"NormalizedEmail\") <= {FieldLengths.Email}");
        });
        builder.HasIndex(user => user.PhoneNumber).IsUnique();
    }
}
