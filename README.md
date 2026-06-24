# Rently

## Quick start after unpacking the ZIP

After extracting the archive, open a terminal in the project root and run:

```bash
cd src/Rently.Api/wwwroot
npm install
cd ../../..
dotnet restore
dotnet run --project src/Rently.Api
```

This installs frontend dependencies used by some static pages and then starts the application locally.

Rently is my bachelor's project: a web application for publishing, searching, and booking rental accommodations.

The project was built as a full-stack application in the .NET ecosystem and combines:

- guest features: browsing offers, filtering, booking, reviews, favorites
- host features: adding and editing accommodations, availability management, booking handling, simple analytics

## Technologies

- C#
- .NET 8
- ASP.NET Core
- Entity Framework Core
- SQLite
- ASP.NET Identity + JWT
- FluentValidation
- Serilog
- ImageSharp
- HTML, CSS, JavaScript
- Bootstrap
- Leaflet / OpenStreetMap / Nominatim
- Flatpickr

## Project structure

- `src/Rently.Domain` - domain entities and enums
- `src/Rently.Application` - application services, DTOs, mappers, business logic
- `src/Rently.Persistence` - database context, EF Core configuration, migrations, seed data
- `src/Rently.Api` - API controllers, middleware, configuration, static frontend files

## Running the project

Requirements:

- .NET 8 SDK

Run from the repository root:

```bash
dotnet restore
dotnet run --project src/Rently.Api
```

The application starts locally using the API project and serves both backend endpoints and frontend static files.

## Notes

- The project uses SQLite in local development.
- Database migrations and seed data are initialized at startup.
- Image, icon, and demo frontend assets are included in the repository.
- Build artifacts and local environment files are not part of the final source package.
