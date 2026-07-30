namespace DigitalKhata.API.DTOs.Requests;

public class CreatePaymentRequestDto
{
    public int SaleId { get; set; }
    public int InstallmentNumber { get; set; }
    public decimal AmountReceived { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public string PaymentType { get; set; } = "Partial";
    public string PaymentMethod { get; set; } = "Cash";
    public string? Notes { get; set; }
    public string ReceivedBy { get; set; } = string.Empty;
}
