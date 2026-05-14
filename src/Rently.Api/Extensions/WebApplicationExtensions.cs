using Microsoft.EntityFrameworkCore;
using Rently.Persistence;
using Serilog;

namespace Rently.Api.Extensions;

public static class WebApplicationExtensions
{
    public static WebApplication UseRentlyPipeline(this WebApplication app)
    {
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

        return app;
    }

    public static async Task InitializeRentlyDatabaseAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<ApplicationDbContext>();

        await db.Database.MigrateAsync();
        await LegacySqliteSchemaRepair.EnsureCompatibilityAsync(db);
        await SeedData.InitializeAsync(services);
    }

    public static void ConfigureRentlyLogging(this WebApplicationBuilder builder)
    {
        Log.Logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

        builder.Host.UseSerilog();
    }
}
