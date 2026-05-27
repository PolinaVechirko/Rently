# Rently

Rently is an ASP.NET Core 8 application for listing rental accommodations, browsing properties, managing bookings, favorites, reviews, host availability, and lightweight analytics. The repository includes both the backend API and the static frontend that is served by the API project.

## Current stack

- .NET 8
- ASP.NET Core Web API
- Entity Framework Core 8
- SQLite
- ASP.NET Identity + JWT authentication
- FluentValidation
- AutoMapper
- Serilog
- xUnit for tests

## Solution structure

- `src/Rently.Api`  
  Entry point of the application. Configures DI, authentication, CORS, middleware, controllers, static file hosting, Swagger in development, database startup, and schema initialization.

- `src/Rently.Application`  
  Application services, DTOs, mappers, validation-related service logic, and use-case orchestration. This layer contains most business behavior and works directly with `ApplicationDbContext`.

- `src/Rently.Domain`  
  Core domain entities such as `Accommodation`, `Booking`, `Review`, `Favorite`, `Photo`, `Amenity`, `Address`, and enums.

- `src/Rently.Persistence`  
  Data access infrastructure: `ApplicationDbContext`, EF Core model configuration, ASP.NET Identity user model, migrations, and development seed data.

- `tests/Rently.Api.Tests`  
  Unit and integration tests for API behavior, validation, application services, image handling, favorites, bookings, accommodations, and review rules.

## Architecture notes

This repository started from a clean-architecture scaffold, but the current codebase is more pragmatic than the original scaffold description.

Important current-state notes:

- The app uses SQLite, not SQL Server.
- `Rently.Persistence` does not currently contain repository classes. Most application services use `ApplicationDbContext` directly.
- The frontend lives inside `src/Rently.Api/wwwroot` and is served as static files by the API project.
- Authentication is based on ASP.NET Identity for user storage and JWT for API access.

## Main backend flow

Typical request flow:

1. Static frontend or external client sends a request to `Rently.Api`.
2. Controller validates and forwards the request to an application service.
3. Application service uses `ApplicationDbContext` to query or update the database.
4. EF Core persists changes into the SQLite database.

## Database and startup behavior

The default local connection string is:

```json
"ConnectionStrings": {
  "DefaultConnection": "Data Source=rently.db"
}
```

At application startup, the API does the following:

1. Builds the HTTP pipeline.
2. Applies EF Core migrations with `Database.MigrateAsync()`.
3. Runs a small legacy SQLite compatibility repair step.
4. Runs seed data initialization.

Seed data is intended for development/demo convenience:

- ensures a few default login accounts exist
- if the database is empty, generates a large demo dataset of users, accommodations, photos, amenities, bookings, and reviews
- fills cover photos where needed

Because of that, a fresh local run quickly produces a populated app instead of an empty site.

## Default development accounts

The seed currently creates these demo accounts with password `Qwerty.123`:

- `alina.petrova@rently.com`
- `maksim.ivanov@rently.com`
- `sophia.kim@rently.com`

## Local development setup

### Prerequisites

- .NET 8 SDK

### Configuration

The repo contains:

- `src/Rently.Api/appsettings.Development.json`
- `src/Rently.Api/appsettings.Development.example.json`

If you need to reset local settings, use the example file as reference. The important settings are:

- `ConnectionStrings:DefaultConnection`
- `Jwt:Key`
- `Jwt:Issuer`
- `Jwt:Audience`
- `Cors:AllowedOrigins`
- `ImageUpload:*`

### Run the application

From the repository root:

```bash
dotnet restore
dotnet run --project src/Rently.Api
```

By default the development profile uses:

- `http://localhost:5000`

On first run, the app will create/update the SQLite database and seed development data.

## API surface

Controllers currently exist for:

- accommodations
- analytics
- auth
- availability blocks
- bookings
- favorites
- images
- reviews

In development, Swagger UI is enabled automatically.

## Frontend

The frontend is not a separate SPA project. It is a set of static HTML, CSS, and JavaScript files under:

- `src/Rently.Api/wwwroot`

This includes pages for:

- home/search
- property details
- login/signup
- bookings
- favorites
- host dashboard
- adding and editing accommodations

## Tests

Run all tests from the repository root:

```bash
dotnet test
```

Testing setup notes:

- integration tests use `WebApplicationFactory<Program>`
- the test host runs in the `Testing` environment
- tests replace the production SQLite registration with EF Core InMemory databases
- in the `Testing` environment, database startup uses `EnsureDeleted`/`EnsureCreated` instead of migrations

## Persistence layer in this project

`src/Rently.Persistence` currently contains:

- `ApplicationDbContext`  
  EF Core context and `DbSet` definitions for the app

- `ApplicationUser`  
  The ASP.NET Identity user extended with app-specific fields such as `Role`, `FullName`, `Bio`, and `ProfilePhotoUrl`

- `Configurations/`  
  Fluent EF Core entity configuration for keys, relationships, delete behaviors, enum storage, and indexes

- `Migrations/`  
  EF Core migration history and current model snapshot

- `SeedData`  
  Development/demo data generation

## A note on the database file

The SQLite database file is created locally during runtime. If you delete `rently.db` and start the application again, migrations and seed data will recreate a working development database.
