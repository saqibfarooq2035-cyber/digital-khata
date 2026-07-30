using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DigitalKhata.API.Models;

public class PaymentRequest
{
    public int Id { get; set; }

    public int SaleId { get; set; }

    public int CustomerId { get; set; }

    public int InstallmentNumber { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [StringLength(50)]
    public string PaymentMethod { get; set; } = string.Empty; // EasyPaisa / JazzCash / Bank Transfer

    [StringLength(100)]
    public string? TransactionId { get; set; }

    [StringLength(500)]
    public string? ReceiptImagePath { get; set; }

    [StringLength(50)]
    public string Status { get; set; } = "Pending"; // Pending / Approved / Rejected

    [StringLength(500)]
    public string? RejectionReason { get; set; }

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReviewedAt { get; set; }

    public int? ReviewedByUserId { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public Sale Sale { get; set; } = null!;

    public Customer Customer { get; set; } = null!;

    public User? ReviewedBy { get; set; }
}
