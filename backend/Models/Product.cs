using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DigitalKhata.API.Models;

public class Product
{
    public int Id { get; set; }

    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;

    [StringLength(50)]
    public string Category { get; set; } = string.Empty; // Mobile, TV, AC, Laptop, Kitchen

    [StringLength(100)]
    public string? SerialNumber { get; set; }

    [StringLength(100)]
    public string? IMEI { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal CostPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal SalePrice { get; set; }

    public int StockQuantity { get; set; }

    [StringLength(500)]
    public string? PhotoPath { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;
}
