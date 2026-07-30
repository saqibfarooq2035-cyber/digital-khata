namespace DigitalKhata.API.DTOs.Requests;

public class UpdateCustomerRequestDto
{
    public string FullName { get; set; } = string.Empty;
    public string CNIC { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = string.Empty;
    public string? AlternatePhone { get; set; }
    public string Address { get; set; } = string.Empty;
    public string? GuarantorName { get; set; }
    public string? GuarantorPhone { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
}
