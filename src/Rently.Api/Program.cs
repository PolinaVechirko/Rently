using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Data.Sqlite;
using Serilog;
using FluentValidation.AspNetCore;
using Rently.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Serilog (basic)
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateLogger();
builder.Host.UseSerilog();

// Configuration placeholders
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=rently.db";
var jwtKey = builder.Configuration["Jwt:Key"] ?? "your-super-secret-key-change-this-in-production";
;

// Services
builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddIdentity<ApplicationUser, Microsoft.AspNetCore.Identity.IdentityRole>(options =>
{
    options.User.RequireUniqueEmail = true;
})
    .AddEntityFrameworkStores<ApplicationDbContext>();

builder.Services.AddScoped<Rently.Application.Interfaces.IAuthService, Rently.Api.Services.AuthService>();
builder.Services.AddScoped<Rently.Application.Interfaces.IAccommodationService, Rently.Api.Services.AccommodationService>();
builder.Services.AddScoped<Rently.Application.Interfaces.IBookingService, Rently.Api.Services.BookingService>();
builder.Services.AddScoped<Rently.Application.Interfaces.IAnalyticsService, Rently.Api.Services.AnalyticsService>();

// Authentication - JWT (skeleton)
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        // Accept enum values as either numbers or strings (improves resilience
        // when frontend might send a name or a numeric value). Also make
        // property name matching case-insensitive for robustness.
        opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        opts.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddAutoMapper(typeof(Program));
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddMemoryCache();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
        builder.AllowAnyOrigin()
               .AllowAnyMethod()
               .AllowAnyHeader());
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseSerilogRequestLogging();
app.UseRouting();

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var db = services.GetRequiredService<ApplicationDbContext>();

    // Apply migrations and self-heal legacy SQLite schema if migration history drifted.
    await db.Database.MigrateAsync();
    await EnsureAspNetUsersBioColumnAsync(db);
    await EnsureFavoritesTypeColumnAsync(db);
    await EnsureReviewReplyColumnsAsync(db);
    await EnsureAvailabilityBlocksTableAsync(db);
    await EnsureAccommodationTitleColumnAsync(db);
    
    // Diagnostic log for ID 1432
    await Rently.Persistence.SeedData.InitializeAsync(services);
}

app.Run();

static async Task EnsureAspNetUsersBioColumnAsync(ApplicationDbContext db)
{
    await using var connection = new SqliteConnection(db.Database.GetConnectionString());
    await connection.OpenAsync();

    await using var command = connection.CreateCommand();
    command.CommandText = "PRAGMA table_info('AspNetUsers');";

    await using var reader = await command.ExecuteReaderAsync();
    var hasBio = false;
    while (await reader.ReadAsync())
    {
        var columnName = reader.GetString(1);
        if (string.Equals(columnName, "Bio", StringComparison.OrdinalIgnoreCase))
        {
            hasBio = true;
            break;
        }
    }

    if (!hasBio)
    {
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"AspNetUsers\" ADD COLUMN \"Bio\" TEXT NULL;");
    }
}

static async Task EnsureFavoritesTypeColumnAsync(ApplicationDbContext db)
{
    await using var connection = new SqliteConnection(db.Database.GetConnectionString());
    await connection.OpenAsync();

    await using var command = connection.CreateCommand();
    command.CommandText = "PRAGMA table_info('Favorites');";

    await using var reader = await command.ExecuteReaderAsync();
    var hasType = false;
    while (await reader.ReadAsync())
    {
        var columnName = reader.GetString(1);
        if (string.Equals(columnName, "Type", StringComparison.OrdinalIgnoreCase))
        {
            hasType = true;
            break;
        }
    }

    if (!hasType)
    {
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Favorites\" ADD COLUMN \"Type\" INTEGER NOT NULL DEFAULT 0;");
    }
}

static async Task EnsureReviewReplyColumnsAsync(ApplicationDbContext db)
{
    await using var connection = new SqliteConnection(db.Database.GetConnectionString());
    await connection.OpenAsync();

    await using var command = connection.CreateCommand();
    command.CommandText = "PRAGMA table_info('Reviews');";

    await using var reader = await command.ExecuteReaderAsync();
    var hasHostReply = false;
    var hasHostReplyCreatedAt = false;
    while (await reader.ReadAsync())
    {
        var columnName = reader.GetString(1);
        if (string.Equals(columnName, "HostReply", StringComparison.OrdinalIgnoreCase)) hasHostReply = true;
        if (string.Equals(columnName, "HostReplyCreatedAt", StringComparison.OrdinalIgnoreCase)) hasHostReplyCreatedAt = true;
    }

    if (!hasHostReply)
    {
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Reviews\" ADD COLUMN \"HostReply\" TEXT NULL;");
    }

    if (!hasHostReplyCreatedAt)
    {
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Reviews\" ADD COLUMN \"HostReplyCreatedAt\" TEXT NULL;");
    }
}

static async Task EnsureAvailabilityBlocksTableAsync(ApplicationDbContext db)
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

static async Task EnsureAccommodationTitleColumnAsync(ApplicationDbContext db)
{
    await using var connection = new SqliteConnection(db.Database.GetConnectionString());
    await connection.OpenAsync();

    await using var command = connection.CreateCommand();
    command.CommandText = "PRAGMA table_info('Accommodations');";

    await using var reader = await command.ExecuteReaderAsync();
    var hasTitle = false;
    while (await reader.ReadAsync())
    {
        var columnName = reader.GetString(1);
        if (string.Equals(columnName, "Title", StringComparison.OrdinalIgnoreCase))
        {
            hasTitle = true;
            break;
        }
    }

    if (!hasTitle)
    {
        Log.Warning("DIAGNOSTIC: Title column missing in Accommodations table. Adding it manually.");
        await db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Accommodations\" ADD COLUMN \"Title\" TEXT NOT NULL DEFAULT '';");
    }
}
