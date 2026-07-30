namespace DigitalKhata.API.DTOs;

public class PaymentDto
{
    public int Id { get; set; }
    public int SaleId { get; set; }
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = "Cash";
}
