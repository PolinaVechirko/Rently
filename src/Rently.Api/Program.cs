using Serilog;
using Rently.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);

builder.ConfigureRentlyLogging();
builder.Services.AddRentlyCoreServices(builder.Configuration, builder.Environment);

var app = builder.Build();

app.UseRentlyPipeline();
await app.InitializeRentlyDatabaseAsync();

app.Run();

public partial class Program;
