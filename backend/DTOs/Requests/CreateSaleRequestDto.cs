namespace DigitalKhata.API.DTOs.Requests;

public class CreateSaleRequestDto
{
    public int CustomerId { get; set; }
    public int ProductId { get; set; }
    public decimal TotalPrice { get; set; }
    public decimal DownPayment { get; set; }
    public decimal RemainingAmount { get; set; }
    public decimal InstallmentAmount { get; set; }
    public int DurationMonths { get; set; }
    public DateTime FirstDueDate { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = "Active";
    public string? Notes { get; set; }
}
