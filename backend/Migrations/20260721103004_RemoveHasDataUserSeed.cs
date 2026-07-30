using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DigitalKhata.API.Migrations
{
    /// <inheritdoc />
    public partial class RemoveHasDataUserSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "FullName", "IsActive", "LastLoginAt", "PasswordHash", "Permissions", "Role", "Username" },
                values: new object[] { 1, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Administrator", true, null, "$2a$11$cmZYP8pHTJyAPOQJ1ozYzemo9kZGMOU8WDhWaE2AcsnstS1RLAaT.", "[\"all\"]", "Admin", "admin" });
        }
    }
}
