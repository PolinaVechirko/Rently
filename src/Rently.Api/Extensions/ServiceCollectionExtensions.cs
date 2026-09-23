using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Rently.Api.Abstractions;
using Rently.Api.Configuration;
using Rently.Api.Services;
using Rently.Application.Configuration;
using Rently.Application.Interfaces;
using Rently.Application.Services.Accommodations;
using Rently.Application.Services.Analytics;
using Rently.Application.Services.Auth;
using Rently.Application.Services.Availability;
using Rently.Application.Services.Bookings;
using Rently.Application.Services.Favorites;
using Rently.Application.Services.Images;
using Rently.Application.Services.Reviews;
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
        var corsOptions = configuration.GetSection(CorsOptions.SectionName).Get<CorsOptions>() ?? new CorsOptions();

        services.AddDbContext<ApplicationDbContext>(options => options.UseSqlite(connectionString));
        services.AddHttpContextAccessor();
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .Validate(
                options => options.HasValidKeyLength(),
                $"Jwt:Key must be at least {JwtOptions.MinimumKeyBytes} bytes long.")
            .ValidateOnStart();
        services.Configure<ImageUploadOptions>(configuration.GetSection(ImageUploadOptions.SectionName));
        services.Configure<CorsOptions>(configuration.GetSection(CorsOptions.SectionName));
        services.AddIdentity<ApplicationUser, IdentityRole>(options =>
        {
            options.User.RequireUniqueEmail = true;
        })
            .AddEntityFrameworkStores<ApplicationDbContext>();

        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAccommodationService, AccommodationService>();
        services.AddScoped<AvailabilityBlockRulesService>();
        services.AddScoped<IAvailabilityBlockService, AvailabilityBlockService>();
        services.AddScoped<BookingAvailabilityService>();
        services.AddScoped<IBookingService, BookingService>();
        services.AddScoped<IFavoriteService, FavoriteService>();
        services.AddScoped<IAnalyticsService, AnalyticsService>();
        services.AddScoped<IImageService, ImageService>();
        services.AddScoped<ReviewEligibilityService>();
        services.AddScoped<IReviewService, ReviewService>();

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
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key))
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
