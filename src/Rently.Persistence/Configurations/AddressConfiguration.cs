using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Rently.Domain.Constants;
using Rently.Domain.Entities;

namespace Rently.Persistence.Configurations;

internal class AddressConfiguration : IEntityTypeConfiguration<Address>
{
    public void Configure(EntityTypeBuilder<Address> builder)
    {
        builder.Property(address => address.Country).HasMaxLength(FieldLengths.Country);
        builder.Property(address => address.City).HasMaxLength(FieldLengths.City);
        builder.ToTable(tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_Addresses_Country_Length",
                $"length(\"Country\") <= {FieldLengths.Country}");
            tableBuilder.HasCheckConstraint(
                "CK_Addresses_City_Length",
                $"length(\"City\") <= {FieldLengths.City}");
        });
    }
}
