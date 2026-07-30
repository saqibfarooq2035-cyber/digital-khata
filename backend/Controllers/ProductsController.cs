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
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _context;

    public ProductsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductResponseDto>>> GetProducts([FromQuery] string? category)
    {
        var query = _context.Products.AsQueryable();
        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(p => p.Category == category);
        }

        var products = await query.OrderByDescending(p => p.CreatedAt).ToListAsync();
        return Ok(products.Select(p => new ProductResponseDto
        {
            Id = p.Id,
            Name = p.Name,
            Category = p.Category,
            SerialNumber = p.SerialNumber,
            IMEI = p.IMEI,
            CostPrice = p.CostPrice,
            SalePrice = p.SalePrice,
            StockQuantity = p.StockQuantity,
            PhotoPath = p.PhotoPath,
            IsActive = p.IsActive,
            CreatedAt = p.CreatedAt
        }));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductResponseDto>> GetProduct(int id)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();

        return Ok(new ProductResponseDto
        {
            Id = product.Id,
            Name = product.Name,
            Category = product.Category,
            SerialNumber = product.SerialNumber,
            IMEI = product.IMEI,
            CostPrice = product.CostPrice,
            SalePrice = product.SalePrice,
            StockQuantity = product.StockQuantity,
            PhotoPath = product.PhotoPath,
            IsActive = product.IsActive,
            CreatedAt = product.CreatedAt
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductResponseDto>> CreateProduct([FromBody] CreateProductRequestDto request)
    {
        var product = new Product
        {
            Name = request.Name,
            Category = request.Category,
            SerialNumber = request.SerialNumber,
            IMEI = request.IMEI,
            CostPrice = request.CostPrice,
            SalePrice = request.SalePrice,
            StockQuantity = request.StockQuantity,
            PhotoPath = request.PhotoPath,
            IsActive = true
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, new ProductResponseDto
        {
            Id = product.Id,
            Name = product.Name,
            Category = product.Category,
            SerialNumber = product.SerialNumber,
            IMEI = product.IMEI,
            CostPrice = product.CostPrice,
            SalePrice = product.SalePrice,
            StockQuantity = product.StockQuantity,
            PhotoPath = product.PhotoPath,
            IsActive = product.IsActive,
            CreatedAt = product.CreatedAt
        });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateProduct(int id, [FromBody] UpdateProductRequestDto request)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();

        product.Name = request.Name;
        product.Category = request.Category;
        product.SerialNumber = request.SerialNumber;
        product.IMEI = request.IMEI;
        product.CostPrice = request.CostPrice;
        product.SalePrice = request.SalePrice;
        product.StockQuantity = request.StockQuantity;
        product.PhotoPath = request.PhotoPath;
        product.IsActive = request.IsActive;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:int}/stock")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateStock(int id, [FromBody] UpdateStockRequestDto request)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound();
        product.StockQuantity = request.StockQuantity;
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
