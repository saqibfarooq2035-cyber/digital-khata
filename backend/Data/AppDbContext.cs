using DigitalKhata.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DigitalKhata.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Sale> Sales => Set<Sale>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<User> Users => Set<User>();
    public DbSet<PaymentRequest> PaymentRequests => Set<PaymentRequest>();
    public DbSet<ShopPaymentAccount> ShopPaymentAccounts => Set<ShopPaymentAccount>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>(entity =>
        {
            entity.HasIndex(e => e.CNIC).IsUnique();
            entity.Property(e => e.FullName).IsRequired().HasMaxLength(200);
            entity.Property(e => e.CNIC).IsRequired().HasMaxLength(20);
            entity.Property(e => e.PhoneNumber).IsRequired().HasMaxLength(20);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.Property(e => e.CostPrice).HasPrecision(18, 2);
            entity.Property(e => e.SalePrice).HasPrecision(18, 2);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
        });

        modelBuilder.Entity<Sale>(entity =>
        {
            entity.Property(e => e.TotalPrice).HasPrecision(18, 2);
            entity.Property(e => e.DownPayment).HasPrecision(18, 2);
            entity.Property(e => e.RemainingAmount).HasPrecision(18, 2);
            entity.Property(e => e.InstallmentAmount).HasPrecision(18, 2);

            entity.HasOne(e => e.Customer)
                .WithMany(c => c.Sales)
                .HasForeignKey(e => e.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Product)
                .WithMany()
                .HasForeignKey(e => e.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(e => e.AmountReceived).HasPrecision(18, 2);

            entity.HasOne(e => e.Sale)
                .WithMany(s => s.Payments)
                .HasForeignKey(e => e.SaleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Username).IsUnique();
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.HasOne(u => u.Customer)
                .WithOne()
                .HasForeignKey<User>(u => u.CustomerId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PaymentRequest>(entity =>
        {
            entity.Property(e => e.Amount).HasColumnType("decimal(18,2)");
            entity.Property(e => e.Status).HasDefaultValue("Pending");

            entity.HasOne(pr => pr.Sale)
                .WithMany()
                .HasForeignKey(pr => pr.SaleId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(pr => pr.Customer)
                .WithMany()
                .HasForeignKey(pr => pr.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(pr => pr.ReviewedBy)
                .WithMany()
                .HasForeignKey(pr => pr.ReviewedByUserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // MySQL-specific defaults: applied last so the explicit configuration above still wins
        // for any property it already targets.
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(string) && property.GetMaxLength() == null)
                {
                    property.SetMaxLength(255);
                }

                if ((property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?)) && property.GetColumnType() == null)
                {
                    property.SetColumnType("datetime(6)");
                }

                if ((property.ClrType == typeof(decimal) || property.ClrType == typeof(decimal?)) && property.GetColumnType() == null && property.GetPrecision() == null)
                {
                    property.SetColumnType("decimal(18,2)");
                }
            }
        }
    }
}
