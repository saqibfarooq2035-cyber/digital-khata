using System.ComponentModel.DataAnnotations;

namespace DigitalKhata.API.Models;

public class Customer
{
    public int Id { get; set; }

    [Required]
    [StringLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string CNIC { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string PhoneNumber { get; set; } = string.Empty;

    [StringLength(20)]
    public string? AlternatePhone { get; set; }

    [StringLength(500)]
    public string Address { get; set; } = string.Empty;

    [StringLength(200)]
    public string? GuarantorName { get; set; }

    [StringLength(20)]
    public string? GuarantorPhone { get; set; }

    [StringLength(500)]
    public string? CustomerPhotoPath { get; set; }

    [StringLength(500)]
    public string? CNICFrontPath { get; set; }

    [StringLength(500)]
    public string? CNICBackPath { get; set; }

    [StringLength(1000)]
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;

    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
}
