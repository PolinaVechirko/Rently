using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rently.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhotoOrderingAndCoverPhoto : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Photos_AccommodationId",
                table: "Photos");

            migrationBuilder.AddColumn<int>(
                name: "SortOrder",
                table: "Photos",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "CoverPhotoId",
                table: "Accommodations",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.Sql("""
                WITH ranked_photos AS (
                    SELECT
                        "Id",
                        ROW_NUMBER() OVER (PARTITION BY "AccommodationId" ORDER BY "Id") - 1 AS "ComputedSortOrder"
                    FROM "Photos"
                )
                UPDATE "Photos"
                SET "SortOrder" = (
                    SELECT ranked_photos."ComputedSortOrder"
                    FROM ranked_photos
                    WHERE ranked_photos."Id" = "Photos"."Id"
                );
                """);

            migrationBuilder.CreateIndex(
                name: "IX_Photos_AccommodationId_SortOrder",
                table: "Photos",
                columns: new[] { "AccommodationId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Accommodations_CoverPhotoId",
                table: "Accommodations",
                column: "CoverPhotoId");

            migrationBuilder.AddForeignKey(
                name: "FK_Accommodations_Photos_CoverPhotoId",
                table: "Accommodations",
                column: "CoverPhotoId",
                principalTable: "Photos",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql("""
                WITH first_photos AS (
                    SELECT
                        "AccommodationId",
                        "Id",
                        ROW_NUMBER() OVER (PARTITION BY "AccommodationId" ORDER BY "SortOrder", "Id") AS "RowNumber"
                    FROM "Photos"
                )
                UPDATE "Accommodations"
                SET "CoverPhotoId" = (
                    SELECT first_photos."Id"
                    FROM first_photos
                    WHERE first_photos."AccommodationId" = "Accommodations"."Id"
                      AND first_photos."RowNumber" = 1
                )
                WHERE EXISTS (
                    SELECT 1
                    FROM first_photos
                    WHERE first_photos."AccommodationId" = "Accommodations"."Id"
                      AND first_photos."RowNumber" = 1
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Accommodations_Photos_CoverPhotoId",
                table: "Accommodations");

            migrationBuilder.DropIndex(
                name: "IX_Photos_AccommodationId_SortOrder",
                table: "Photos");

            migrationBuilder.DropIndex(
                name: "IX_Accommodations_CoverPhotoId",
                table: "Accommodations");

            migrationBuilder.DropColumn(
                name: "SortOrder",
                table: "Photos");

            migrationBuilder.DropColumn(
                name: "CoverPhotoId",
                table: "Accommodations");

            migrationBuilder.CreateIndex(
                name: "IX_Photos_AccommodationId",
                table: "Photos",
                column: "AccommodationId");
        }
    }
}
