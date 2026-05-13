using System;
using System.Collections.Generic;
using Microsoft.AspNetCore.Identity;
using Rently.Domain.Entities;

namespace Rently.Persistence
{
    public class ApplicationUser : IdentityUser
    {
        public UserRole Role { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Bio { get; set; }
        public string? ProfilePhotoUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<Accommodation>? Accommodations { get; set; }
        public ICollection<Booking>? Bookings { get; set; }
        public ICollection<Review>? Reviews { get; set; }
        public ICollection<Favorite>? Favorites { get; set; }
    }
}
