using Serilog;
using Rently.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.ConfigureRentlyLogging();
builder.Services.AddRentlyCoreServices(builder.Configuration);

var app = builder.Build();

app.UseRentlyPipeline();
await app.InitializeRentlyDatabaseAsync();

app.Run();
