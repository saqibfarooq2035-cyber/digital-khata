namespace DigitalKhata.API.DTOs.Responses;

public class ProductResponseDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string? IMEI { get; set; }
    public decimal CostPrice { get; set; }
    public decimal SalePrice { get; set; }
    public int StockQuantity { get; set; }
    public string? PhotoPath { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}
