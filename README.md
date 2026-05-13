# Rently — scaffold

This repository contains a scaffold for a Clean-Architecture ASP.NET Core backend and simple static frontend.

Structure
- `src/Rently.Api` — ASP.NET Core Web API (entry point)
- `src/Rently.Application` — application layer (DTOs, services, interfaces)
- `src/Rently.Domain` — domain entities and value objects
- `src/Rently.Persistence` — EF Core DbContext, migrations and repository implementations

Included integrations
- Entity Framework Core (SQL Server)
- ASP.NET Identity + JWT authentication
- Swagger (OpenAPI)
- Serilog
- FluentValidation
- AutoMapper

Quick start
1. Install .NET SDK (recommended: .NET 7)
2. From repository root run:

```bash
dotnet restore
dotnet new sln -n Rently && dotnet sln add src/Rently.Api/Rently.Api.csproj src/Rently.Application/Rently.Application.csproj src/Rently.Domain/Rently.Domain.csproj src/Rently.Persistence/Rently.Persistence.csproj
dotnet ef migrations add InitialCreate -p src/Rently.Persistence -s src/Rently.Api
dotnet ef database update -p src/Rently.Persistence -s src/Rently.Api
dotnet run --project src/Rently.Api
```

Notes
- Replace connection string in `src/Rently.Api/Program.cs` or provide via configuration/secrets.
- This scaffold is intentionally minimal — implement business logic, DTOs and controllers in respective folders.
