using System.ComponentModel.DataAnnotations;

namespace DigitalKhata.API.Models;

public class ShopPaymentAccount
{
    public int Id { get; set; }

    [StringLength(50)]
    public string AccountType { get; set; } = string.Empty; // EasyPaisa / JazzCash / Bank

    [StringLength(200)]
    public string AccountTitle { get; set; } = string.Empty;

    [StringLength(50)]
    public string? AccountNumber { get; set; }

    [StringLength(100)]
    public string? BankName { get; set; }

    [StringLength(50)]
    public string? IBAN { get; set; }

    [StringLength(500)]
    public string? Instructions { get; set; }

    public bool IsActive { get; set; } = true;

    public int DisplayOrder { get; set; }
}
