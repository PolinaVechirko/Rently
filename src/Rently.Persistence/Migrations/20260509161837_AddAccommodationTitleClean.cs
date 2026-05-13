using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rently.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAccommodationTitleClean : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Accommodations",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Title",
                table: "Accommodations");
        }
    }
}
