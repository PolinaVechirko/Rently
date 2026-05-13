using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rently.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFavoriteType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Favorites",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "Favorites");
        }
    }
}
