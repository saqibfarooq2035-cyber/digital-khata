using DigitalKhata.API.Data;
using DigitalKhata.API.DTOs.Requests;
using DigitalKhata.API.DTOs.Responses;
using DigitalKhata.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DigitalKhata.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SalesController : ControllerBase
{
    private readonly AppDbContext _context;

    public SalesController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SaleResponseDto>>> GetSales()
    {
        var sales = await _context.Sales.Include(s => s.Customer).Include(s => s.Product).OrderByDescending(s => s.SaleDate).ToListAsync();
        return Ok(sales.Select(s => new SaleResponseDto
        {
            Id = s.Id,
            CustomerId = s.CustomerId,
            ProductId = s.ProductId,
            SaleDate = s.SaleDate,
            TotalPrice = s.TotalPrice,
            DownPayment = s.DownPayment,
            RemainingAmount = s.RemainingAmount,
            InstallmentAmount = s.InstallmentAmount,
            DurationMonths = s.DurationMonths,
            FirstDueDate = s.FirstDueDate,
            PaymentMethod = s.PaymentMethod,
            Status = s.Status,
            Notes = s.Notes,
            Customer = s.Customer == null ? null : new CustomerResponseDto
            {
                Id = s.Customer.Id,
                FullName = s.Customer.FullName,
                CNIC = s.Customer.CNIC,
                PhoneNumber = s.Customer.PhoneNumber,
                Address = s.Customer.Address,
                CreatedAt = s.Customer.CreatedAt
            },
            Product = s.Product == null ? null : new ProductResponseDto
            {
                Id = s.Product.Id,
                Name = s.Product.Name,
                Category = s.Product.Category,
                CostPrice = s.Product.CostPrice,
                SalePrice = s.Product.SalePrice,
                StockQuantity = s.Product.StockQuantity,
                IsActive = s.Product.IsActive,
                CreatedAt = s.Product.CreatedAt
            }
        }));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<SaleResponseDto>> GetSale(int id)
    {
        var sale = await _context.Sales.Include(s => s.Customer).Include(s => s.Product).FirstOrDefaultAsync(s => s.Id == id);
        if (sale == null) return NotFound();

        return Ok(new SaleResponseDto
        {
            Id = sale.Id,
            CustomerId = sale.CustomerId,
            ProductId = sale.ProductId,
            SaleDate = sale.SaleDate,
            TotalPrice = sale.TotalPrice,
            DownPayment = sale.DownPayment,
            RemainingAmount = sale.RemainingAmount,
            InstallmentAmount = sale.InstallmentAmount,
            DurationMonths = sale.DurationMonths,
            FirstDueDate = sale.FirstDueDate,
            PaymentMethod = sale.PaymentMethod,
            Status = sale.Status,
            Notes = sale.Notes,
            Customer = new CustomerResponseDto
            {
                Id = sale.Customer.Id,
                FullName = sale.Customer.FullName,
                CNIC = sale.Customer.CNIC,
                PhoneNumber = sale.Customer.PhoneNumber,
                Address = sale.Customer.Address,
                CreatedAt = sale.Customer.CreatedAt
            },
            Product = new ProductResponseDto
            {
                Id = sale.Product.Id,
                Name = sale.Product.Name,
                Category = sale.Product.Category,
                CostPrice = sale.Product.CostPrice,
                SalePrice = sale.Product.SalePrice,
                StockQuantity = sale.Product.StockQuantity,
                IsActive = sale.Product.IsActive,
                CreatedAt = sale.Product.CreatedAt
            }
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<SaleResponseDto>> CreateSale([FromBody] CreateSaleRequestDto request)
    {
        var customer = await _context.Customers.FindAsync(request.CustomerId);
        var product = await _context.Products.FindAsync(request.ProductId);
        if (customer == null || product == null) return BadRequest();

        var sale = new Sale
        {
            CustomerId = request.CustomerId,
            ProductId = request.ProductId,
            SaleDate = DateTime.UtcNow,
            TotalPrice = request.TotalPrice,
            DownPayment = request.DownPayment,
            RemainingAmount = request.RemainingAmount,
            InstallmentAmount = request.InstallmentAmount,
            DurationMonths = request.DurationMonths,
            FirstDueDate = request.FirstDueDate,
            PaymentMethod = request.PaymentMethod,
            Status = request.Status,
            Notes = request.Notes
        };

        _context.Sales.Add(sale);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetSale), new { id = sale.Id }, new SaleResponseDto
        {
            Id = sale.Id,
            CustomerId = sale.CustomerId,
            ProductId = sale.ProductId,
            SaleDate = sale.SaleDate,
            TotalPrice = sale.TotalPrice,
            DownPayment = sale.DownPayment,
            RemainingAmount = sale.RemainingAmount,
            InstallmentAmount = sale.InstallmentAmount,
            DurationMonths = sale.DurationMonths,
            FirstDueDate = sale.FirstDueDate,
            PaymentMethod = sale.PaymentMethod,
            Status = sale.Status,
            Notes = sale.Notes
        });
    }

    [HttpGet("today-due")]
    public async Task<ActionResult<IEnumerable<SaleResponseDto>>> GetTodayDueSales()
    {
        var today = DateTime.UtcNow.Date;
        var sales = await _context.Sales.Where(s => s.FirstDueDate.Date == today).ToListAsync();
        return Ok(sales.Select(s => new SaleResponseDto
        {
            Id = s.Id,
            CustomerId = s.CustomerId,
            ProductId = s.ProductId,
            SaleDate = s.SaleDate,
            TotalPrice = s.TotalPrice,
            DownPayment = s.DownPayment,
            RemainingAmount = s.RemainingAmount,
            InstallmentAmount = s.InstallmentAmount,
            DurationMonths = s.DurationMonths,
            FirstDueDate = s.FirstDueDate,
            PaymentMethod = s.PaymentMethod,
            Status = s.Status,
            Notes = s.Notes
        }));
    }

    [HttpGet("overdue")]
    public async Task<ActionResult<IEnumerable<SaleResponseDto>>> GetOverdueSales()
    {
        var sales = await _context.Sales.Where(s => s.Status == "Overdue" || s.RemainingAmount > 0).ToListAsync();
        return Ok(sales.Select(s => new SaleResponseDto
        {
            Id = s.Id,
            CustomerId = s.CustomerId,
            ProductId = s.ProductId,
            SaleDate = s.SaleDate,
            TotalPrice = s.TotalPrice,
            DownPayment = s.DownPayment,
            RemainingAmount = s.RemainingAmount,
            InstallmentAmount = s.InstallmentAmount,
            DurationMonths = s.DurationMonths,
            FirstDueDate = s.FirstDueDate,
            PaymentMethod = s.PaymentMethod,
            Status = s.Status,
            Notes = s.Notes
        }));
    }
}
