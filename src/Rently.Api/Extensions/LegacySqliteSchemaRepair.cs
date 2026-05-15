using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Rently.Persistence;
using Serilog;

namespace Rently.Api.Extensions;

internal static class LegacySqliteSchemaRepair
{
    private const string SqliteProviderName = "Microsoft.EntityFrameworkCore.Sqlite";
    private const string SchemaFixesTable = "__RentlySchemaFixes";
    private const string LegacyHostFavoritesBackfilledFixId = "LegacyHostFavoritesBackfilled";

    public static async Task EnsureCompatibilityAsync(ApplicationDbContext db)
    {
        if (!IsSqlite(db))
        {
            return;
        }

        if (!await RequiresCompatibilityFixesAsync(db))
        {
            return;
        }

        var favoritesTypeMissing = !await HasColumnAsync(db, "Favorites", "Type");
        var favoritesCompositeKeyMissingType = !(await GetPrimaryKeyColumnsAsync(db, "Favorites"))
            .SequenceEqual(["UserId", "AccommodationId", "Type"]);

        await EnsureAspNetUsersBioColumnAsync(db);
        await EnsureFavoritesTypeColumnAsync(db);
        await EnsureFavoritesCompositeKeyAsync(db);
        await EnsureReviewReplyColumnsAsync(db);
        await EnsureAvailabilityBlocksTableAsync(db);
        await EnsureAccommodationTitleColumnAsync(db);

        if (favoritesTypeMissing || favoritesCompositeKeyMissingType || await NeedsLegacyHostFavoritesBackfillAsync(db))
        {
            await EnsureLegacyHostFavoritesBackfilledAsync(db);
        }
    }

    internal static async Task<bool> RequiresCompatibilityFixesAsync(ApplicationDbContext db)
    {
        if (!IsSqlite(db))
        {
            return false;
        }

        if (!await TableExistsAsync(db, "AspNetUsers"))
        {
            return false;
        }

        if (!await HasColumnAsync(db, "AspNetUsers", "Bio"))
        {
            return true;
        }

        if (!await HasColumnAsync(db, "Favorites", "Type"))
        {
            return true;
        }

        if (!await HasColumnAsync(db, "Reviews", "HostReply") ||
            !await HasColumnAsync(db, "Reviews", "HostReplyCreatedAt"))
        {
            return true;
        }

        if (!await TableExistsAsync(db, "AvailabilityBlocks"))
        {
            return true;
        }

        if (!await HasColumnAsync(db, "Accommodations", "Title"))
        {
            return true;
        }

        var keyColumns = await GetPrimaryKeyColumnsAsync(db, "Favorites");
        if (!keyColumns.SequenceEqual(["UserId", "AccommodationId", "Type"]))
        {
            return true;
        }

        return await NeedsLegacyHostFavoritesBackfillAsync(db);
    }

    private static async Task EnsureAspNetUsersBioColumnAsync(ApplicationDbContext db)
    {
        if (!await HasColumnAsync(db, "AspNetUsers", "Bio"))
        {
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"AspNetUsers\" ADD COLUMN \"Bio\" TEXT NULL;");
        }
    }

    private static async Task EnsureFavoritesTypeColumnAsync(ApplicationDbContext db)
    {
        if (!await HasColumnAsync(db, "Favorites", "Type"))
        {
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Favorites\" ADD COLUMN \"Type\" INTEGER NOT NULL DEFAULT 0;");
        }
    }

    private static async Task EnsureFavoritesCompositeKeyAsync(ApplicationDbContext db)
    {
        var keyColumns = await GetPrimaryKeyColumnsAsync(db, "Favorites");

        if (keyColumns.SequenceEqual(new[] { "UserId", "AccommodationId", "Type" }))
        {
            return;
        }

        Log.Warning("DIAGNOSTIC: Favorites primary key is missing Type. Rebuilding Favorites table.");
        await db.Database.ExecuteSqlRawAsync(@"
PRAGMA foreign_keys=OFF;

CREATE TABLE ""Favorites_new"" (
    ""UserId"" TEXT NOT NULL,
    ""AccommodationId"" INTEGER NOT NULL,
    ""Type"" INTEGER NOT NULL DEFAULT 0,
    ""CreatedAt"" TEXT NOT NULL,
    CONSTRAINT ""PK_Favorites"" PRIMARY KEY (""UserId"", ""AccommodationId"", ""Type""),
    CONSTRAINT ""FK_Favorites_Accommodations_AccommodationId"" FOREIGN KEY (""AccommodationId"") REFERENCES ""Accommodations"" (""Id"") ON DELETE CASCADE,
    CONSTRAINT ""FK_Favorites_AspNetUsers_UserId"" FOREIGN KEY (""UserId"") REFERENCES ""AspNetUsers"" (""Id"") ON DELETE CASCADE
);

INSERT OR IGNORE INTO ""Favorites_new"" (""UserId"", ""AccommodationId"", ""Type"", ""CreatedAt"")
SELECT ""UserId"", ""AccommodationId"", COALESCE(""Type"", 0), ""CreatedAt""
FROM ""Favorites"";

DROP TABLE ""Favorites"";
ALTER TABLE ""Favorites_new"" RENAME TO ""Favorites"";
CREATE INDEX IF NOT EXISTS ""IX_Favorites_AccommodationId"" ON ""Favorites"" (""AccommodationId"");

PRAGMA foreign_keys=ON;
");
    }

    private static async Task EnsureLegacyHostFavoritesBackfilledAsync(ApplicationDbContext db)
    {
        await EnsureSchemaFixesTableAsync(db);

        if (await HasSchemaFixAsync(db, LegacyHostFavoritesBackfilledFixId))
        {
            return;
        }

        await db.Database.ExecuteSqlRawAsync($@"
INSERT OR IGNORE INTO ""Favorites"" (""UserId"", ""AccommodationId"", ""Type"", ""CreatedAt"")
SELECT ""UserId"", ""AccommodationId"", 1, ""CreatedAt""
FROM ""Favorites""
WHERE ""Type"" = 0;

INSERT INTO ""{SchemaFixesTable}"" (""Id"", ""AppliedAt"")
VALUES ('{LegacyHostFavoritesBackfilledFixId}', datetime('now'));
");
    }

    private static async Task EnsureReviewReplyColumnsAsync(ApplicationDbContext db)
    {
        if (!await HasColumnAsync(db, "Reviews", "HostReply"))
        {
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Reviews\" ADD COLUMN \"HostReply\" TEXT NULL;");
        }

        if (!await HasColumnAsync(db, "Reviews", "HostReplyCreatedAt"))
        {
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Reviews\" ADD COLUMN \"HostReplyCreatedAt\" TEXT NULL;");
        }
    }

    private static async Task EnsureAvailabilityBlocksTableAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS ""AvailabilityBlocks"" (
    ""Id"" INTEGER NOT NULL CONSTRAINT ""PK_AvailabilityBlocks"" PRIMARY KEY AUTOINCREMENT,
    ""AccommodationId"" INTEGER NOT NULL,
    ""StartDate"" TEXT NOT NULL,
    ""EndDate"" TEXT NOT NULL,
    ""Note"" TEXT NULL,
    ""CreatedAt"" TEXT NOT NULL,
    CONSTRAINT ""FK_AvailabilityBlocks_Accommodations_AccommodationId"" FOREIGN KEY (""AccommodationId"") REFERENCES ""Accommodations"" (""Id"") ON DELETE CASCADE
);
");
    }

    private static async Task EnsureAccommodationTitleColumnAsync(ApplicationDbContext db)
    {
        if (!await HasColumnAsync(db, "Accommodations", "Title"))
        {
            Log.Warning("DIAGNOSTIC: Title column missing in Accommodations table. Adding it manually.");
            await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Accommodations\" ADD COLUMN \"Title\" TEXT NOT NULL DEFAULT '';");
        }
    }

    private static bool IsSqlite(ApplicationDbContext db)
    {
        return string.Equals(db.Database.ProviderName, SqliteProviderName, StringComparison.Ordinal);
    }

    private static async Task<bool> TableExistsAsync(ApplicationDbContext db, string tableName)
    {
        await using var connection = new SqliteConnection(db.Database.GetConnectionString());
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = @"SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = $tableName LIMIT 1;";
        command.Parameters.AddWithValue("$tableName", tableName);

        return await command.ExecuteScalarAsync() != null;
    }

    private static async Task<bool> HasColumnAsync(ApplicationDbContext db, string tableName, string columnName)
    {
        await using var connection = new SqliteConnection(db.Database.GetConnectionString());
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = $@"PRAGMA table_info(""{tableName}"");";

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            if (string.Equals(reader.GetString(1), columnName, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static async Task<string[]> GetPrimaryKeyColumnsAsync(ApplicationDbContext db, string tableName)
    {
        await using var connection = new SqliteConnection(db.Database.GetConnectionString());
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = $@"PRAGMA table_info(""{tableName}"");";

        var primaryKeyColumns = new List<(string Name, int Order)>();
        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var pkOrder = reader.GetInt32(5);
            if (pkOrder > 0)
            {
                primaryKeyColumns.Add((reader.GetString(1), pkOrder));
            }
        }

        return primaryKeyColumns
            .OrderBy(column => column.Order)
            .Select(column => column.Name)
            .ToArray();
    }

    private static async Task EnsureSchemaFixesTableAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
CREATE TABLE IF NOT EXISTS ""__RentlySchemaFixes"" (
    ""Id"" TEXT NOT NULL CONSTRAINT ""PK___RentlySchemaFixes"" PRIMARY KEY,
    ""AppliedAt"" TEXT NOT NULL
);
");
    }

    private static async Task<bool> NeedsLegacyHostFavoritesBackfillAsync(ApplicationDbContext db)
    {
        if (!await TableExistsAsync(db, SchemaFixesTable))
        {
            return false;
        }

        return !await HasSchemaFixAsync(db, LegacyHostFavoritesBackfilledFixId);
    }

    private static async Task<bool> HasSchemaFixAsync(ApplicationDbContext db, string fixId)
    {
        await using var connection = new SqliteConnection(db.Database.GetConnectionString());
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText = $@"SELECT 1 FROM ""{SchemaFixesTable}"" WHERE ""Id"" = $id LIMIT 1;";
        command.Parameters.AddWithValue("$id", fixId);
        return await command.ExecuteScalarAsync() != null;
    }
}
