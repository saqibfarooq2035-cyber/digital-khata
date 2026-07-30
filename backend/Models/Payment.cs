using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DigitalKhata.API.Models;

public class Payment
{
    public int Id { get; set; }

    public int SaleId { get; set; }

    public int InstallmentNumber { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal AmountReceived { get; set; }

    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    [StringLength(50)]
    public string PaymentType { get; set; } = "Partial"; // Full, Partial

    [StringLength(50)]
    public string PaymentMethod { get; set; } = "Cash"; // Cash, Bank, EasyPaisa, JazzCash

    [StringLength(1000)]
    public string? Notes { get; set; }

    [StringLength(200)]
    public string ReceivedBy { get; set; } = string.Empty;

    public Sale Sale { get; set; } = null!;
}
