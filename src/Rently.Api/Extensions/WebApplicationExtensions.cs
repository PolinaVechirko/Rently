using Microsoft.EntityFrameworkCore;
using Rently.Api.Middleware;
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
        app.UseStaticFiles(new StaticFileOptions
        {
            // Pages and scripts are revalidated on every load, so a new deploy is picked up without cache-busting query strings.
            OnPrepareResponse = context =>
            {
                var extension = Path.GetExtension(context.File.Name);
                if (extension is ".html" or ".js" or ".css")
                {
                    context.Context.Response.Headers.CacheControl = "no-cache";
                }
            }
        });

        app.UseSerilogRequestLogging();
        app.UseMiddleware<ApiExceptionHandlingMiddleware>();
        app.UseRouting();

        app.UseCors(ServiceCollectionExtensions.AppCorsPolicyName);
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

        if (app.Environment.IsEnvironment("Testing"))
        {
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
            return;
        }

        await db.Database.MigrateAsync();
        await SeedData.InitializeAsync(services, app.Environment.WebRootPath);
    }

    public static void ConfigureRentlyLogging(this WebApplicationBuilder builder)
    {
        Log.Logger = new LoggerConfiguration()
            .WriteTo.Console()
            .CreateLogger();

        builder.Host.UseSerilog();
    }
}
