namespace DigitalKhata.API.DTOs.Responses;

public class CustomerResponseDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string CNIC { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? AlternatePhone { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? GuarantorName { get; set; }
    public string? GuarantorPhone { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; }
    public string Status { get; set; } = "Active";
    public decimal TotalSale { get; set; }
    public decimal TotalPaid { get; set; }
    public decimal RemainingBalance { get; set; }
    public string? CustomerPhotoPath { get; set; }
    public string? CNICFrontPath { get; set; }
    public string? CNICBackPath { get; set; }
    public DateTime CreatedAt { get; set; }
}
