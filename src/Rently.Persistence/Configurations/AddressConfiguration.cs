using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class AddressConfiguration : IEntityTypeConfiguration<Address>
{
    public void Configure(EntityTypeBuilder<Address> builder)
    {
        builder.Property(address => address.Country).HasMaxLength(100);
        builder.Property(address => address.City).HasMaxLength(100);
        builder.ToTable(tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_Addresses_Country_Length",
                "length(\"Country\") <= 100");
            tableBuilder.HasCheckConstraint(
                "CK_Addresses_City_Length",
                "length(\"City\") <= 100");
        });
    }
}
