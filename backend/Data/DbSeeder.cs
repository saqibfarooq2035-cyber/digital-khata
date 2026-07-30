using DigitalKhata.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DigitalKhata.API.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await SeedShopPaymentAccountsAsync(context);

        if (await context.Users.CountAsync() > 0)
        {
            return;
        }

        var now = DateTime.UtcNow;

        // 1. Users
        var admin = new User
        {
            Username = "admin",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
            FullName = "Admin User",
            Role = "Admin",
            Permissions = "[\"all\"]",
            IsActive = true,
            CreatedAt = DateTime.Now
        };

        var staff = new User
        {
            Username = "staff1",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("staff123"),
            FullName = "Staff Member",
            Role = "Staff",
            IsActive = true,
            CreatedAt = DateTime.Now
        };

        context.Users.AddRange(admin, staff);
        await context.SaveChangesAsync();

        // 2. Products
        var tv = new Product { Name = "Samsung 55 Smart TV", Category = "TV", SerialNumber = "SN-TV-2025-001", CostPrice = 85000, SalePrice = 100000, StockQuantity = 12, IsActive = true };
        var iphone = new Product { Name = "iPhone 15 128GB", Category = "Mobile", IMEI = "351234567890123", CostPrice = 210000, SalePrice = 250000, StockQuantity = 3, IsActive = true };
        var ac = new Product { Name = "AC 1.5 Ton Haier", Category = "AC", SerialNumber = "SN-AC-2025-088", CostPrice = 70000, SalePrice = 85000, StockQuantity = 0, IsActive = true };
        var laptop = new Product { Name = "Dell Laptop i5", Category = "Laptop", SerialNumber = "SN-LP-2025-045", CostPrice = 110000, SalePrice = 135000, StockQuantity = 7, IsActive = true };
        var fridge = new Product { Name = "Samsung Refrigerator", Category = "Kitchen", SerialNumber = "SN-RF-2025-012", CostPrice = 95000, SalePrice = 120000, StockQuantity = 5, IsActive = true };

        context.Products.AddRange(tv, iphone, ac, laptop, fridge);
        await context.SaveChangesAsync();

        // 3. Customers
        var aliHassan = new Customer { FullName = "Ali Hassan", CNIC = "35202-1234567-1", PhoneNumber = "0301-1234567", Address = "Rawalpindi", IsActive = true, CreatedAt = now.AddMonths(-3) };
        var saraAhmed = new Customer { FullName = "Sara Ahmed", CNIC = "35201-9876543-2", PhoneNumber = "0312-9876543", Address = "Islamabad", IsActive = true, CreatedAt = now.AddMonths(-2) };
        var fahadKhan = new Customer { FullName = "Fahad Khan", CNIC = "35202-5551234-3", PhoneNumber = "0333-5551234", Address = "Rawalpindi", IsActive = true, CreatedAt = now.AddMonths(-2) };
        var zainabBibi = new Customer { FullName = "Zainab Bibi", CNIC = "35201-7771234-8", PhoneNumber = "0345-7771234", Address = "Lahore", IsActive = true, CreatedAt = now.AddMonths(-1) };

        context.Customers.AddRange(aliHassan, saraAhmed, fahadKhan, zainabBibi);
        await context.SaveChangesAsync();

        // Customer portal login accounts — added after customers are saved so their IDs exist.
        var aliLogin = new User
        {
            Username = "03011234567",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Ali@1234"),
            FullName = "Ali Hassan",
            Role = "Customer",
            CustomerId = aliHassan.Id,
            IsActive = true,
            CreatedAt = DateTime.Now
        };

        var fahadLogin = new User
        {
            Username = "03335551234",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Fahad@1234"),
            FullName = "Fahad Khan",
            Role = "Customer",
            CustomerId = fahadKhan.Id,
            IsActive = true,
            CreatedAt = DateTime.Now
        };

        context.Users.AddRange(aliLogin, fahadLogin);
        await context.SaveChangesAsync();

        Console.WriteLine("✅ Customer Portal backend model ready!");

        // 4. Sales
        var sale1 = new Sale
        {
            Customer = fahadKhan,
            Product = tv,
            SaleDate = now.AddMonths(-2),
            TotalPrice = 100000,
            DownPayment = 20000,
            RemainingAmount = 80000,
            InstallmentAmount = 10000,
            DurationMonths = 8,
            FirstDueDate = now.AddMonths(-1).AddDays(15),
            PaymentMethod = "Cash",
            Status = "Active"
        };

        var sale2 = new Sale
        {
            Customer = aliHassan,
            Product = iphone,
            SaleDate = now.AddMonths(-3),
            TotalPrice = 250000,
            DownPayment = 50000,
            RemainingAmount = 200000,
            InstallmentAmount = 25000,
            DurationMonths = 8,
            FirstDueDate = now.AddMonths(-2).AddDays(15),
            PaymentMethod = "Cash",
            Status = "Overdue"
        };

        var sale3 = new Sale
        {
            Customer = saraAhmed,
            Product = laptop,
            SaleDate = now.AddMonths(-1),
            TotalPrice = 135000,
            DownPayment = 35000,
            RemainingAmount = 100000,
            InstallmentAmount = 12500,
            DurationMonths = 8,
            FirstDueDate = now.AddDays(-15),
            PaymentMethod = "EasyPaisa",
            Status = "Active"
        };

        context.Sales.AddRange(sale1, sale2, sale3);
        await context.SaveChangesAsync();

        // 5. Payments — each reduces the sale's remaining balance, mirroring PaymentsController.CreatePayment.
        void AddPayment(Sale sale, int installmentNumber, decimal amount, DateTime date, string method)
        {
            context.Payments.Add(new Payment
            {
                Sale = sale,
                InstallmentNumber = installmentNumber,
                AmountReceived = amount,
                PaymentDate = date,
                PaymentMethod = method,
                PaymentType = "Full"
            });
            sale.RemainingAmount = Math.Max(0, sale.RemainingAmount - amount);
        }

        // Sale 1 (Fahad Khan - Samsung TV): 3 of 8 installments paid.
        AddPayment(sale1, 1, 10000, sale1.SaleDate.AddDays(25), "Cash");
        AddPayment(sale1, 2, 10000, sale1.SaleDate.AddDays(55), "Cash");
        AddPayment(sale1, 3, 10000, now.AddDays(-1), "Bank");

        // Sale 2 (Ali Hassan - iPhone): 2 of 8 installments paid, rest overdue.
        AddPayment(sale2, 1, 25000, sale2.SaleDate.AddDays(25), "Cash");
        AddPayment(sale2, 2, 25000, sale2.SaleDate.AddDays(55), "EasyPaisa");

        // Sale 3 (Sara Ahmed - Laptop): 1 of 8 installments paid.
        AddPayment(sale3, 1, 12500, now.AddDays(-15), "EasyPaisa");

        await context.SaveChangesAsync();

        Console.WriteLine("✅ Database seeded successfully!");
    }

    private static async Task SeedShopPaymentAccountsAsync(AppDbContext context)
    {
        if (await context.ShopPaymentAccounts.CountAsync() > 0)
        {
            return;
        }

        context.ShopPaymentAccounts.AddRange(
            new ShopPaymentAccount
            {
                AccountType = "EasyPaisa",
                AccountTitle = "Ali Electronics",
                AccountNumber = "0300-1234567",
                Instructions = "Send to this number and upload screenshot",
                IsActive = true,
                DisplayOrder = 1
            },
            new ShopPaymentAccount
            {
                AccountType = "JazzCash",
                AccountTitle = "Ali Electronics",
                AccountNumber = "0300-1234567",
                Instructions = "Send to this number and upload screenshot",
                IsActive = true,
                DisplayOrder = 2
            },
            new ShopPaymentAccount
            {
                AccountType = "Bank Transfer",
                AccountTitle = "Ali Electronics",
                BankName = "HBL",
                IBAN = "PK36HABB0000049957011533",
                AccountNumber = "0499-5701153-3",
                Instructions = "Transfer to this account and upload receipt",
                IsActive = true,
                DisplayOrder = 3
            }
        );

        await context.SaveChangesAsync();
        Console.WriteLine("✅ Shop payment accounts seeded!");
    }
}
