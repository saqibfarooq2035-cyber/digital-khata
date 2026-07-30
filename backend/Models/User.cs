using System.ComponentModel.DataAnnotations;

namespace DigitalKhata.API.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    [StringLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [StringLength(200)]
    public string FullName { get; set; } = string.Empty;

    [StringLength(50)]
    public string Role { get; set; } = "Staff"; // Admin, Staff, Customer

    [StringLength(1000)]
    public string Permissions { get; set; } = "[]"; // JSON array

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastLoginAt { get; set; }

    public int? CustomerId { get; set; }

    public Customer? Customer { get; set; }
}
