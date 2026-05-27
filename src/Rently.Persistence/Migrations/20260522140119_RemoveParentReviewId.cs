using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rently.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveParentReviewId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reviews_Reviews_ParentReviewId",
                table: "Reviews");

            migrationBuilder.DropIndex(
                name: "IX_Reviews_ParentReviewId",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "ParentReviewId",
                table: "Reviews");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ParentReviewId",
                table: "Reviews",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_ParentReviewId",
                table: "Reviews",
                column: "ParentReviewId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reviews_Reviews_ParentReviewId",
                table: "Reviews",
                column: "ParentReviewId",
                principalTable: "Reviews",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
