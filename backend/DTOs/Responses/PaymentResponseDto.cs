namespace DigitalKhata.API.DTOs.Responses;

public class PaymentResponseDto
{
    public int Id { get; set; }
    public int SaleId { get; set; }
    public int InstallmentNumber { get; set; }
    public decimal AmountReceived { get; set; }
    public DateTime PaymentDate { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string ReceivedBy { get; set; } = string.Empty;
}
