using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DigitalKhata.API.Models;

public class Sale
{
    public int Id { get; set; }

    public int CustomerId { get; set; }

    public int ProductId { get; set; }

    public DateTime SaleDate { get; set; } = DateTime.UtcNow;

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalPrice { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DownPayment { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal RemainingAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal InstallmentAmount { get; set; }

    public int DurationMonths { get; set; }

    public DateTime FirstDueDate { get; set; }

    [StringLength(50)]
    public string PaymentMethod { get; set; } = string.Empty;

    [StringLength(50)]
    public string Status { get; set; } = "Active"; // Active, Completed, Overdue

    [StringLength(1000)]
    public string? Notes { get; set; }

    public Customer Customer { get; set; } = null!;

    public Product Product { get; set; } = null!;

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
