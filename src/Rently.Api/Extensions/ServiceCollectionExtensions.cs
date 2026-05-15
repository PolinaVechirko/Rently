using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Options;
using Rently.Api.Abstractions;
using Rently.Api.Configuration;
using Rently.Application.Configuration;
using Rently.Application.Interfaces;
using Rently.Persistence;

namespace Rently.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public const string AppCorsPolicyName = "AppCors";

    public static IServiceCollection AddRentlyCoreServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") ?? "Data Source=rently.db";
        var jwtOptions = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>() ?? new JwtOptions();
        var corsOptions = configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>() ?? new CorsOptions();

        services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));
        services.AddHttpContextAccessor();
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<ImageUploadOptions>(configuration.GetSection(ImageUploadOptions.SectionName));
        services.Configure<CorsOptions>(configuration.GetSection(CorsOptions.SectionName));
        services.AddIdentity<ApplicationUser, Microsoft.AspNetCore.Identity.IdentityRole>(options =>
        {
            options.User.RequireUniqueEmail = true;
        })
            .AddEntityFrameworkStores<ApplicationDbContext>();

        services.AddScoped<ICurrentUserService, Rently.Api.Services.CurrentUserService>();
        services.AddScoped<IJwtTokenService, Rently.Api.Services.JwtTokenService>();
        services.AddScoped<Rently.Application.Interfaces.IAuthService, Rently.Application.Services.Auth.AuthService>();
        services.AddScoped<Rently.Application.Interfaces.IAccommodationService, Rently.Application.Services.Accommodations.AccommodationService>();
        services.AddScoped<Rently.Application.Services.Availability.AvailabilityBlockRulesService>();
        services.AddScoped<Rently.Application.Interfaces.IAvailabilityBlockService, Rently.Application.Services.Availability.AvailabilityBlockService>();
        services.AddScoped<Rently.Application.Services.Bookings.BookingAvailabilityService>();
        services.AddScoped<Rently.Application.Interfaces.IBookingService, Rently.Application.Services.Bookings.BookingService>();
        services.AddScoped<Rently.Application.Interfaces.IFavoriteService, Rently.Application.Services.Favorites.FavoriteService>();
        services.AddScoped<Rently.Application.Interfaces.IAnalyticsService, Rently.Application.Services.Analytics.AnalyticsService>();
        services.AddScoped<Rently.Application.Interfaces.IImageService, Rently.Application.Services.Images.ImageService>();
        services.AddScoped<Rently.Application.Services.Reviews.ReviewEligibilityService>();
        services.AddScoped<Rently.Application.Interfaces.IReviewService, Rently.Application.Services.Reviews.ReviewService>();

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer();

        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((options, jwtOptionsAccessor) =>
            {
                var jwtOptions = jwtOptionsAccessor.Value;
                var strictJwtValidation = !environment.IsDevelopment() && !environment.IsEnvironment("Testing");

                if (strictJwtValidation)
                {
                    if (jwtOptions.UsesDefaultDevelopmentKey())
                    {
                        throw new InvalidOperationException("A non-default JWT signing key is required outside Development and Testing.");
                    }

                    if (string.IsNullOrWhiteSpace(jwtOptions.Issuer) || string.IsNullOrWhiteSpace(jwtOptions.Audience))
                    {
                        throw new InvalidOperationException("JWT issuer and audience must be configured outside Development and Testing.");
                    }
                }

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = strictJwtValidation,
                    ValidateAudience = strictJwtValidation,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.GetSigningKey()))
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
        services.AddValidatorsFromAssemblyContaining<Program>();
        services.AddFluentValidationAutoValidation();
        services.AddMemoryCache();

        services.AddCors(options =>
        {
            options.AddPolicy(AppCorsPolicyName, policy =>
            {
                if (environment.IsDevelopment() || environment.IsEnvironment("Testing"))
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                    return;
                }

                if (corsOptions.AllowedOrigins.Length > 0)
                {
                    policy.WithOrigins(corsOptions.AllowedOrigins)
                          .AllowAnyMethod()
                          .AllowAnyHeader();
                    return;
                }

                policy.SetIsOriginAllowed(_ => false)
                      .AllowAnyMethod()
                      .AllowAnyHeader();
            });
        });

        return services;
    }
}
