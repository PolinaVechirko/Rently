using System;
using System.Linq;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Rently.Persistence;
using Rently.Application.DTOs;
using Rently.Api.Services;

var optionsBuilder = new DbContextOptionsBuilder<ApplicationDbContext>();
optionsBuilder.UseSqlite("Data Source=src/Rently.Api/rently.db");

using (var context = new ApplicationDbContext(optionsBuilder.Options))
{
    var acc = context.Accommodations
        .Include(a => a.Address)
        .FirstOrDefault(a => a.Id == 1432);

    if (acc == null) {
        Console.WriteLine("Accommodation 1432 not found.");
    } else {
        // Simulate MapToDto
        var dto = new AccommodationDto {
            Id = acc.Id,
            Title = acc.Title,
            Description = acc.Description
        };

        var json = JsonSerializer.Serialize(dto, new JsonSerializerOptions { 
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true 
        });

        Console.WriteLine("SERIALIZED DTO:");
        Console.WriteLine(json);
    }
}
