using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Rently.Api.Extensions;
using Rently.Persistence;

namespace Rently.Api.Tests.Api;

public class LegacySqliteSchemaRepairTests
{
    [Fact]
    public async Task RequiresCompatibilityFixesAsync_InMemoryProvider_ReturnsFalse()
    {
        await using var db = TestApplicationDbContextFactory.Create();

        var result = await LegacySqliteSchemaRepair.RequiresCompatibilityFixesAsync(db);

        Assert.False(result);
    }

    [Fact]
    public async Task RequiresCompatibilityFixesAsync_CurrentSqliteSchema_ReturnsFalse()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlite(connection)
            .Options;

        await using var db = new ApplicationDbContext(options);
        await db.Database.EnsureCreatedAsync();

        var result = await LegacySqliteSchemaRepair.RequiresCompatibilityFixesAsync(db);

        Assert.False(result);
    }
}
