using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Rently.Domain.Entities;

namespace Rently.Persistence
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Accommodation> Accommodations { get; set; } = null!;
        public DbSet<Address> Addresses { get; set; } = null!;
        public DbSet<Amenity> Amenities { get; set; } = null!;
        public DbSet<AccommodationAmenity> AccommodationAmenities { get; set; } = null!;
        public DbSet<Photo> Photos { get; set; } = null!;
        public DbSet<Booking> Bookings { get; set; } = null!;
        public DbSet<Review> Reviews { get; set; } = null!;
        public DbSet<Favorite> Favorites { get; set; } = null!;
        public DbSet<AvailabilityBlock> AvailabilityBlocks { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<ApplicationUser>(b =>
            {
                b.Property(u => u.Role).HasConversion<string>();
                b.HasIndex(u => u.PhoneNumber).IsUnique();
            });

            builder.Entity<Accommodation>(b =>
            {
                b.Property(a => a.PropertyType).HasConversion<string>();

                b.HasOne<ApplicationUser>()
                 .WithMany(u => u.Accommodations)
                 .HasForeignKey(a => a.HostId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(a => a.Address)
                 .WithMany(addr => addr.Accommodations)
                 .HasForeignKey(a => a.AddressId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Booking>(b =>
            {
                b.Property(bk => bk.Status).HasConversion<string>();

                b.HasOne<ApplicationUser>()
                 .WithMany(u => u.Bookings)
                 .HasForeignKey(bk => bk.GuestId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(bk => bk.Accommodation)
                 .WithMany(a => a.Bookings)
                 .HasForeignKey(bk => bk.AccommodationId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<Review>(b =>
            {
                b.HasOne<ApplicationUser>()
                 .WithMany(u => u.Reviews)
                 .HasForeignKey(r => r.GuestId)
                 .OnDelete(DeleteBehavior.Restrict);

                b.HasOne(r => r.Accommodation)
                 .WithMany(a => a.Reviews)
                 .HasForeignKey(r => r.AccommodationId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(r => r.ParentReview)
                 .WithMany()
                 .HasForeignKey(r => r.ParentReviewId)
                 .OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<AvailabilityBlock>(b =>
            {
                b.HasOne(ab => ab.Accommodation)
                 .WithMany()
                 .HasForeignKey(ab => ab.AccommodationId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<Favorite>(b =>
            {
                b.HasKey(f => new { f.UserId, f.AccommodationId });

                b.HasOne<ApplicationUser>()
                 .WithMany(u => u.Favorites)
                 .HasForeignKey(f => f.UserId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(f => f.Accommodation)
                 .WithMany(a => a.FavoritedBy)
                 .HasForeignKey(f => f.AccommodationId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<AccommodationAmenity>(b =>
            {
                b.HasKey(aa => new { aa.AccommodationId, aa.AmenityId });

                b.HasOne(aa => aa.Accommodation)
                 .WithMany(a => a.AccommodationAmenities)
                 .HasForeignKey(aa => aa.AccommodationId)
                 .OnDelete(DeleteBehavior.Cascade);

                b.HasOne(aa => aa.Amenity)
                 .WithMany(am => am.AccommodationAmenities)
                 .HasForeignKey(aa => aa.AmenityId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<Amenity>(b =>
            {
                b.HasIndex(a => a.Name).IsUnique();
            });
        }
    }
}
