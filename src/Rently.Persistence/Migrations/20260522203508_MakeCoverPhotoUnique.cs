using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rently.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakeCoverPhotoUnique : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Accommodations_CoverPhotoId",
                table: "Accommodations");

            migrationBuilder.CreateIndex(
                name: "IX_Accommodations_CoverPhotoId",
                table: "Accommodations",
                column: "CoverPhotoId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Accommodations_CoverPhotoId",
                table: "Accommodations");

            migrationBuilder.CreateIndex(
                name: "IX_Accommodations_CoverPhotoId",
                table: "Accommodations",
                column: "CoverPhotoId");
        }
    }
}
