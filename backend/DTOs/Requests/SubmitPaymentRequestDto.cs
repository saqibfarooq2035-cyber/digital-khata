namespace DigitalKhata.API.DTOs.Requests;

public class SubmitPaymentRequestDto
{
    public int InstallmentNumber { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string? TransactionId { get; set; }
    public string? Notes { get; set; }
    public IFormFile? ReceiptImage { get; set; }
}
