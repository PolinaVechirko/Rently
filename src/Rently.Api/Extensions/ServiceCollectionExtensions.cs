using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Rently.Persistence;

namespace Rently.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddRentlyCoreServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "Data Source=rently.db";
        var jwtKey = configuration["Jwt:Key"] ?? "your-super-secret-key-change-this-in-production";

        services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));
        services.AddIdentity<ApplicationUser, Microsoft.AspNetCore.Identity.IdentityRole>(options =>
        {
            options.User.RequireUniqueEmail = true;
        })
            .AddEntityFrameworkStores<ApplicationDbContext>();

        services.AddScoped<Rently.Application.Interfaces.IAuthService, Rently.Api.Services.AuthService>();
        services.AddScoped<Rently.Application.Interfaces.IAccommodationService, Rently.Api.Services.AccommodationService>();
        services.AddScoped<Rently.Application.Interfaces.IAvailabilityBlockService, Rently.Api.Services.AvailabilityBlockService>();
        services.AddScoped<Rently.Application.Interfaces.IBookingService, Rently.Api.Services.BookingService>();
        services.AddScoped<Rently.Application.Interfaces.IFavoriteService, Rently.Api.Services.FavoriteService>();
        services.AddScoped<Rently.Application.Interfaces.IAnalyticsService, Rently.Api.Services.AnalyticsService>();
        services.AddScoped<Rently.Application.Interfaces.IImageService, Rently.Api.Services.ImageService>();
        services.AddScoped<Rently.Application.Interfaces.IReviewService, Rently.Api.Services.ReviewService>();

        services.AddAuthentication(options =>
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

        services.AddControllers()
            .AddJsonOptions(opts =>
            {
                opts.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                opts.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
                opts.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
            });

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        services.AddAutoMapper(typeof(Program));
        services.AddFluentValidationAutoValidation();
        services.AddMemoryCache();

        services.AddCors(options =>
        {
            options.AddPolicy("AllowAll", policy =>
                policy.AllowAnyOrigin()
                      .AllowAnyMethod()
                      .AllowAnyHeader());
        });

        return services;
    }
}
