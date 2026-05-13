using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rently.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PopulateCatchyTitles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE Accommodations 
                SET Title = CASE 
                    WHEN (Id % 5 = 0) THEN 'Sunny Cozy Retreat'
                    WHEN (Id % 5 = 1) THEN 'Modern Urban Haven'
                    WHEN (Id % 5 = 2) THEN 'Charming Peace Garden'
                    WHEN (Id % 5 = 3) THEN 'Luxury Vacation Spot'
                    WHEN (Id % 5 = 4) THEN 'Elegant Dream Home'
                    ELSE 'Beautiful Rently Property'
                END
                WHERE Title = '' OR Title IS NULL OR Title = 'Property';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
