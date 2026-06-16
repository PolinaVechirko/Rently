using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Rently.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFieldLengthLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddCheckConstraint(
                name: "CK_Reviews_Comment_Length",
                table: "Reviews",
                sql: "\"Comment\" IS NULL OR length(\"Comment\") <= 1000");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Reviews_HostReply_Length",
                table: "Reviews",
                sql: "\"HostReply\" IS NULL OR length(\"HostReply\") <= 1000");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AspNetUsers_Email_Length",
                table: "AspNetUsers",
                sql: "\"Email\" IS NULL OR length(\"Email\") <= 254");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AspNetUsers_FullName_Length",
                table: "AspNetUsers",
                sql: "length(\"FullName\") <= 100");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AspNetUsers_NormalizedEmail_Length",
                table: "AspNetUsers",
                sql: "\"NormalizedEmail\" IS NULL OR length(\"NormalizedEmail\") <= 254");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Addresses_City_Length",
                table: "Addresses",
                sql: "length(\"City\") <= 100");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Addresses_Country_Length",
                table: "Addresses",
                sql: "length(\"Country\") <= 100");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Accommodations_Description_Length",
                table: "Accommodations",
                sql: "\"Description\" IS NULL OR length(\"Description\") <= 2000");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Accommodations_Title_Length",
                table: "Accommodations",
                sql: "length(\"Title\") <= 100");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Reviews_Comment_Length",
                table: "Reviews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Reviews_HostReply_Length",
                table: "Reviews");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AspNetUsers_Email_Length",
                table: "AspNetUsers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AspNetUsers_FullName_Length",
                table: "AspNetUsers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AspNetUsers_NormalizedEmail_Length",
                table: "AspNetUsers");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Addresses_City_Length",
                table: "Addresses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Addresses_Country_Length",
                table: "Addresses");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Accommodations_Description_Length",
                table: "Accommodations");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Accommodations_Title_Length",
                table: "Accommodations");
        }
    }
}
