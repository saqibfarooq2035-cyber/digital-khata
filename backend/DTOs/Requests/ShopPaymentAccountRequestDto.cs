namespace DigitalKhata.API.DTOs.Requests;

public class ShopPaymentAccountRequestDto
{
    public string AccountType { get; set; } = string.Empty;
    public string AccountTitle { get; set; } = string.Empty;
    public string? AccountNumber { get; set; }
    public string? BankName { get; set; }
    public string? IBAN { get; set; }
    public string? Instructions { get; set; }
    public bool IsActive { get; set; } = true;
    public int DisplayOrder { get; set; }
}
