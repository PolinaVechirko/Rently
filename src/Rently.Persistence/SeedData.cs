using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Rently.Domain.Entities;

namespace Rently.Persistence
{
    public static class SeedData
    {
        private static readonly string[] DefaultAmenityNames =
        {
            "TV", "Kitchen", "Heating", "Dedicated Workspace", "Washer",
            "Pets Allowed", "Balcony", "Self Check-in", "Crib", "Pool",
            "Dryer", "Iron", "Smoke Alarm", "First Aid Kit", "Wi-Fi",
            "Free Parking", "Air Conditioning", "Gym", "Meal Service",
            "Family Friendly"
        };

        private const string DemoPassword = "Qwerty.123";

        private static readonly string[] AccommodationPhotoExtensions = { ".jpg", ".jpeg", ".png", ".webp" };

        public static async Task InitializeAsync(IServiceProvider serviceProvider, string webRootPath)
        {
            var context = serviceProvider.GetRequiredService<ApplicationDbContext>();
            var userManager = serviceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger(typeof(SeedData));

            List<Amenity> amenities = await EnsureAmenitiesAsync(context);

            if (context.Users.Any() || context.Accommodations.Any())
            {
                logger.LogInformation("Database already seeded. Skipping demo data generation.");
                return;
            }

            logger.LogInformation("Seeding 1000 demo users and their accommodations.");
            var random = new Random();
            
            // All demo accounts share one password, so it is hashed once instead of 1000 times.
            var passwordHash = userManager.PasswordHasher.HashPassword(new ApplicationUser(), DemoPassword);

            string[] firstNames = { "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Nancy", "Lisa", "Betty", "Margaret", "Sandra", "Paul", "Donald", "George", "Kenneth", "Steven", "Edward", "Brian", "Ronald", "Anthony", "Kevin", "Jason", "Jeff", "Amy", "Michelle", "Laura", "Kimberly", "Deborah" };
            string[] lastNames = { "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson" };
            string[] locations = { "France, Paris", "Italy, Rome", "UAE, Dubai", "Thailand, Bangkok", "UK, London", "USA, New York", "Japan, Tokyo", "Spain, Madrid", "Germany, Berlin", "Brazil, Rio de Janeiro", "Australia, Sydney", "Canada, Toronto", "Mexico, Mexico City", "Russia, Moscow", "Turkey, Istanbul" };
            PropertyType[] types = { PropertyType.Apartment, PropertyType.House, PropertyType.Villa, PropertyType.Chalet, PropertyType.Studio };

            string[] descTemplates = {
                "Experience the ultimate luxury in this stunning {0}. Located in the heart of {1}, this property offers breathtaking views and world-class amenities. The interior is professionally designed with high-end finishes throughout. Perfect for both short-term vacations and long-term stays.",
                "Welcome to your home away from home! This cozy and modern {0} in {1} is fully equipped with everything you need for a comfortable stay. Within walking distance to major attractions, local cafes, and public transport. Enjoy the vibrant local atmosphere while staying in a peaceful, quiet neighborhood.",
                "Discover the charm of {1} from this elegant {0}. Featuring spacious rooms, a fully renovated kitchen, and a private balcony, this property is ideal for families or groups. We pride ourselves on cleanliness and attention to detail to ensure your stay is perfect.",
                "A rare find! This beautiful {0} combines historic architecture with modern comforts. Nestled in a prime location in {1}, it's the perfect base for exploring the city's rich history and culture. High-speed Wi-Fi and a dedicated workspace make it great for digital nomads.",
                "Relax and unwind in this high-floor {0} with panoramic skyline views of {1}. Modern, bright, and airy, this space has been thoughtfully curated for a premium guest experience. Includes access to all building facilities including the gym and pool area."
            };

            string[] reviewTemplates = {
                "Absolutely loved my stay! The place was spotless and the host went above and beyond to make us feel welcome. Highly recommend!",
                "Great location and very comfortable. The description was accurate, and the view from the balcony was even better than the photos.",
                "A truly wonderful experience. The apartment was stylish, quiet, and in a perfect spot for exploring the city.",
                "Fantastic host and a beautiful property. Everything was handled professionally, and we had no issues at all during our stay.",
                "Perfect for a weekend getaway. The interior design is stunning and the amenities are top-notch. Will definitely come back!",
                "The location is unbeatable. So many great restaurants and shops nearby. The bed was incredibly comfortable.",
                "Exceptional hospitality. We felt right at home. The property was very well maintained and clean."
            };

            var hosts = new List<string>();
            var guests = new List<string>();
            var profilePhotos = new[] { "/images/avatars/avatar1.jpg", "/images/avatars/avatar2.jpg", "/images/avatars/avatar3.jpg", "/images/avatars/avatar4.jpg", "/images/avatars/avatar5.jpg", "/images/avatars/avatar6.jpg" };
            var bios = new[]
            {
                "Loves welcoming guests and keeping spaces spotless.",
                "Enjoys design, travel, and smooth check-ins.",
                "Host focused on comfort, fast replies, and local tips.",
                "Building memorable stays for business and leisure guests.",
                "Hospitality-first host with a calm, reliable style."
            };

            for (int i = 0; i < 1000; i++)
            {
                var role = i < 500 ? UserRole.Host : (i < 700 ? UserRole.Both : UserRole.Guest);
                var fName = firstNames[random.Next(firstNames.Length)];
                var lName = lastNames[random.Next(lastNames.Length)];
                var email = $"{fName.ToLower()}.{lName.ToLower()}{i}@rently.com";
                var u = new ApplicationUser {
                    Id = Guid.NewGuid().ToString(),
                    UserName = email,
                    NormalizedUserName = userManager.NormalizeName(email),
                    Email = email,
                    NormalizedEmail = userManager.NormalizeEmail(email),
                    FullName = $"{fName} {lName}",
                    Bio = bios[random.Next(bios.Length)],
                    PhoneNumber = $"+1 555 3{i:000000}",
                    ProfilePhotoUrl = profilePhotos[random.Next(profilePhotos.Length)],
                    PasswordHash = passwordHash,
                    SecurityStamp = Guid.NewGuid().ToString(),
                    Role = role,
                    CreatedAt = DateTime.UtcNow.AddYears(-random.Next(1, 10)).AddMonths(-random.Next(1, 12)) 
                };
                context.Users.Add(u);
                if (role == UserRole.Host || role == UserRole.Both) hosts.Add(u.Id);
                if (role == UserRole.Guest || role == UserRole.Both) guests.Add(u.Id);

                if (i % 200 == 0) await context.SaveChangesAsync();
            }
            await context.SaveChangesAsync();
            logger.LogInformation("Demo users seeded.");

            var allImageFiles = GetAccommodationPhotoUrls(webRootPath);

            int aCount = 0;
            foreach (var hId in hosts)
            {
                int pCount = random.Next(1, 4);
                for (int j = 0; j < pCount; j++)
                {
                    var locStr = locations[random.Next(locations.Length)];
                    var type = types[random.Next(types.Length)];
                    var loc = locStr.Split(", ");
                    var acc = new Accommodation {
                        HostId = hId,
                        PropertyType = type,
                        PricePerNight = random.Next(50, 1000),
                        RoomsCount = random.Next(1, 6),
                        BedsCount = random.Next(1, 8),
                        Description = string.Format(descTemplates[random.Next(descTemplates.Length)], type, loc[1]),
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow.AddDays(-random.Next(1, 300)),
                        Address = new Address { Country = loc[0], City = loc[1] }
                    };
                    context.Accommodations.Add(acc);

                    // Add some related data
                    acc.Photos = allImageFiles.Count == 0
                        ? []
                        : Enumerable.Range(0, 3)
                            .Select(index => new Photo { Url = allImageFiles[random.Next(allImageFiles.Count)], SortOrder = index })
                            .ToList();
                    
                    var selectedAmenities = amenities.OrderBy(x => random.Next()).Take(random.Next(5, 10)).ToList();
                    foreach (var am in selectedAmenities) 
                        context.AccommodationAmenities.Add(new AccommodationAmenity { Accommodation = acc, AmenityId = am.Id });
                    
                    // Add 3-6 reviews
                    int reviewsToSeed = random.Next(3, 7);
                    for (int r = 0; r < reviewsToSeed; r++) 
                        context.Reviews.Add(new Review { 
                            Accommodation = acc, 
                            GuestId = guests[random.Next(guests.Count)], 
                            Rating = random.Next(4, 6), 
                            Comment = reviewTemplates[random.Next(reviewTemplates.Length)], 
                            CreatedAt = DateTime.UtcNow.AddDays(-random.Next(1, 100)) 
                        });
                    
                    // Add 5 bookings
                    for (int b = 0; b < 5; b++) {
                        var start = DateTime.UtcNow.AddDays(-random.Next(1, 100));
                        var statusRoll = random.Next(100);
                        var status = statusRoll < 70 ? BookingStatus.Confirmed : statusRoll < 88 ? BookingStatus.Pending : BookingStatus.Cancelled;
                        context.Bookings.Add(new Booking { Accommodation = acc, GuestId = guests[random.Next(guests.Count)], CheckInDate = start, CheckOutDate = start.AddDays(random.Next(2, 7)), Status = status });
                    }
                    aCount++;
                }
                if (hosts.IndexOf(hId) % 50 == 0) {
                    await context.SaveChangesAsync();
                    context.ChangeTracker.Clear();
                    logger.LogInformation("Seeded {Count} accommodations...", aCount);
                }
            }
            await context.SaveChangesAsync();
            await EnsureAccommodationCoverPhotosAsync(context);
            logger.LogInformation("Seeding complete. Total accommodations: {Count}", aCount);
        }

        // Demo listing photos live in their own folder so page assets (hero, footer, cities, avatars) are never picked.
        private static List<string> GetAccommodationPhotoUrls(string webRootPath)
        {
            var photosDirectory = System.IO.Path.Combine(webRootPath, "images", "accommodations");
            if (!System.IO.Directory.Exists(photosDirectory))
            {
                return [];
            }

            return System.IO.Directory.GetFiles(photosDirectory)
                .Where(file => AccommodationPhotoExtensions.Contains(System.IO.Path.GetExtension(file), StringComparer.OrdinalIgnoreCase))
                .Select(file => $"/images/accommodations/{System.IO.Path.GetFileName(file)}")
                .ToList();
        }

        private static async Task EnsureAccommodationCoverPhotosAsync(ApplicationDbContext context)
        {
            var accommodations = await context.Accommodations
                .Include(accommodation => accommodation.Photos)
                .Where(accommodation => accommodation.CoverPhotoId == null)
                .ToListAsync();

            foreach (var accommodation in accommodations)
            {
                accommodation.CoverPhotoId = accommodation.Photos?
                    .OrderBy(photo => photo.SortOrder)
                    .ThenBy(photo => photo.Id)
                    .Select(photo => (int?)photo.Id)
                    .FirstOrDefault();
            }

            await context.SaveChangesAsync();
        }

        private static async Task<List<Amenity>> EnsureAmenitiesAsync(ApplicationDbContext context)
        {
            var existingAmenities = await context.Amenities
                .ToListAsync();

            var existingAmenityNames = existingAmenities
                .Select(amenity => amenity.Name)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

            var missingAmenities = DefaultAmenityNames
                .Where(name => !existingAmenityNames.Contains(name))
                .Select(name => new Amenity { Name = name })
                .ToList();

            if (missingAmenities.Count > 0)
            {
                context.Amenities.AddRange(missingAmenities);
                await context.SaveChangesAsync();
                existingAmenities.AddRange(missingAmenities);
            }

            return existingAmenities
                .GroupBy(amenity => amenity.Name, StringComparer.OrdinalIgnoreCase)
                .Select(group => group.First())
                .ToList();
        }
    }
}
