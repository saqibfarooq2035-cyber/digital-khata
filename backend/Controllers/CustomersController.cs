using System.Net.Http.Json;
using DigitalKhata.API.Data;
using DigitalKhata.API.DTOs.Requests;
using DigitalKhata.API.DTOs.Responses;
using DigitalKhata.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DigitalKhata.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private const string WhatsAppServiceUrl = "http://localhost:3001/api/whatsapp/send-single";

    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;

    public CustomersController(AppDbContext context, IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CustomerResponseDto>>> GetCustomers([FromQuery] string? search, [FromQuery] string? status)
    {
        var query = _context.Customers.Include(c => c.Sales).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c => c.FullName.Contains(search) || c.PhoneNumber.Contains(search) || c.CNIC.Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status.Equals("active", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(c => c.IsActive);
            }
            else if (status.Equals("cleared", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(c => !c.IsActive);
            }
            else if (status.Equals("overdue", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(c => c.Sales.Any(s => s.Status == "Overdue" || s.RemainingAmount > 0));
            }
        }

        var customers = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return Ok(customers.Select(c =>
        {
            var totalSale = c.Sales.Sum(s => s.TotalPrice);
            var totalPaid = c.Sales.Sum(s => s.TotalPrice - s.RemainingAmount);
            var remainingBalance = c.Sales.Sum(s => s.RemainingAmount);
            var computedStatus = !c.IsActive ? "Cleared" : c.Sales.Any(s => s.Status == "Overdue" || s.RemainingAmount > 0) ? "Overdue" : "Active";

            return new CustomerResponseDto
            {
                Id = c.Id,
                FullName = c.FullName,
                CNIC = c.CNIC,
                PhoneNumber = c.PhoneNumber,
                AlternatePhone = c.AlternatePhone,
                Address = c.Address,
                GuarantorName = c.GuarantorName,
                GuarantorPhone = c.GuarantorPhone,
                Notes = c.Notes,
                IsActive = c.IsActive,
                Status = computedStatus,
                TotalSale = totalSale,
                TotalPaid = totalPaid,
                RemainingBalance = remainingBalance,
                CustomerPhotoPath = c.CustomerPhotoPath,
                CNICFrontPath = c.CNICFrontPath,
                CNICBackPath = c.CNICBackPath,
                CreatedAt = c.CreatedAt
            };
        }));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CustomerResponseDto>> GetCustomer(int id)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound();

        return Ok(new CustomerResponseDto
        {
            Id = customer.Id,
            FullName = customer.FullName,
            CNIC = customer.CNIC,
            PhoneNumber = customer.PhoneNumber,
            AlternatePhone = customer.AlternatePhone,
            Address = customer.Address,
            GuarantorName = customer.GuarantorName,
            GuarantorPhone = customer.GuarantorPhone,
            Notes = customer.Notes,
            IsActive = customer.IsActive,
            CustomerPhotoPath = customer.CustomerPhotoPath,
            CNICFrontPath = customer.CNICFrontPath,
            CNICBackPath = customer.CNICBackPath,
            CreatedAt = customer.CreatedAt
        });
    }

    [HttpGet("{id:int}/ledger")]
    public async Task<ActionResult<object>> GetLedger(int id)
    {
        var customer = await _context.Customers.Include(c => c.Sales).ThenInclude(s => s.Payments).FirstOrDefaultAsync(c => c.Id == id);
        if (customer == null) return NotFound();

        var sales = customer.Sales.Select(s => new
        {
            s.Id,
            s.TotalPrice,
            s.DownPayment,
            s.RemainingAmount,
            s.Status,
            s.FirstDueDate,
            s.InstallmentAmount,
            s.DurationMonths,
            Payments = s.Payments.Select(p => new { p.InstallmentNumber, p.AmountReceived, p.PaymentDate, p.PaymentMethod }).ToList()
        }).ToList();

        return Ok(new
        {
            customer = new CustomerResponseDto
            {
                Id = customer.Id,
                FullName = customer.FullName,
                CNIC = customer.CNIC,
                PhoneNumber = customer.PhoneNumber,
                Address = customer.Address,
                Notes = customer.Notes,
                IsActive = customer.IsActive,
                CreatedAt = customer.CreatedAt
            },
            sales,
            balance = sales.Sum(x => x.RemainingAmount)
        });
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CustomerResponseDto>> CreateCustomer([FromBody] CreateCustomerRequestDto request)
    {
        var customer = new Customer
        {
            FullName = request.FullName,
            CNIC = request.CNIC,
            PhoneNumber = request.PhoneNumber,
            AlternatePhone = request.AlternatePhone,
            Address = request.Address,
            GuarantorName = request.GuarantorName,
            GuarantorPhone = request.GuarantorPhone,
            Notes = request.Notes,
            IsActive = true
        };

        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetCustomer), new { id = customer.Id }, new CustomerResponseDto
        {
            Id = customer.Id,
            FullName = customer.FullName,
            CNIC = customer.CNIC,
            PhoneNumber = customer.PhoneNumber,
            AlternatePhone = customer.AlternatePhone,
            Address = customer.Address,
            GuarantorName = customer.GuarantorName,
            GuarantorPhone = customer.GuarantorPhone,
            Notes = customer.Notes,
            IsActive = customer.IsActive,
            CreatedAt = customer.CreatedAt
        });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateCustomer(int id, [FromBody] UpdateCustomerRequestDto request)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound();

        customer.FullName = request.FullName;
        customer.CNIC = request.CNIC;
        customer.PhoneNumber = request.PhoneNumber;
        customer.AlternatePhone = request.AlternatePhone;
        customer.Address = request.Address;
        customer.GuarantorName = request.GuarantorName;
        customer.GuarantorPhone = request.GuarantorPhone;
        customer.Notes = request.Notes;
        customer.IsActive = request.IsActive;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteCustomer(int id)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound();
        customer.IsActive = false;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("overdue")]
    public async Task<ActionResult<IEnumerable<object>>> GetOverdueCustomers()
    {
        var overdueCustomers = await _context.Sales
            .Where(s => s.Status == "Overdue" || s.RemainingAmount > 0)
            .Select(s => new
            {
                CustomerId = s.CustomerId,
                CustomerName = s.Customer.FullName,
                RemainingAmount = s.RemainingAmount,
                FirstDueDate = s.FirstDueDate
            })
            .Distinct()
            .ToListAsync();

        return Ok(overdueCustomers);
    }

    [HttpPost("{id:int}/create-login")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<IActionResult> CreateLogin(int id, [FromBody] CreateCustomerLoginRequestDto request)
    {
        var customer = await _context.Customers.FindAsync(id);
        if (customer == null) return NotFound(new { message = "Customer not found" });

        var existingLogin = await _context.Users.AnyAsync(u => u.CustomerId == id);
        if (existingLogin)
        {
            return BadRequest(new { message = "Login already exists for this customer" });
        }

        if (string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new { message = "Password is required" });
        }

        var username = string.IsNullOrWhiteSpace(request.Username) ? customer.PhoneNumber : request.Username.Trim();

        var usernameTaken = await _context.Users.AnyAsync(u => u.Username == username);
        if (usernameTaken)
        {
            return BadRequest(new { message = "Username is already taken" });
        }

        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = customer.FullName,
            Role = "Customer",
            CustomerId = customer.Id,
            Permissions = "[]",
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var whatsAppSent = false;
        if (request.SendWhatsApp)
        {
            whatsAppSent = await TrySendLoginCredentialsAsync(customer, username, request.Password);
        }

        return Ok(new { success = true, message = "Login created successfully", whatsAppSent });
    }

    [HttpPut("{id:int}/reset-password")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new { message = "New password is required" });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.CustomerId == id);
        if (user == null) return NotFound(new { message = "No login exists for this customer" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Password reset successfully" });
    }

    [HttpDelete("{id:int}/remove-login")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RemoveLogin(int id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.CustomerId == id);
        if (user == null) return NotFound(new { message = "No login exists for this customer" });

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Login removed successfully" });
    }

    [HttpGet("{id:int}/login-status")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<object>> GetLoginStatus(int id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.CustomerId == id);

        return Ok(new
        {
            hasLogin = user != null,
            username = user?.Username,
            lastLogin = user?.LastLoginAt?.ToString("yyyy-MM-dd")
        });
    }

    private async Task<bool> TrySendLoginCredentialsAsync(Customer customer, string username, string password)
    {
        try
        {
            var message = $"السلام علیکم {customer.FullName} صاحب!\n\n" +
                "آپ کا Digital Khata account بن گیا ہے۔\n\n" +
                "Your Digital Khata login:\n" +
                $"Username: {username}\n" +
                $"Password: {password}\n\n" +
                "Login here: http://localhost:5173/login\n\n" +
                "— Digital Khata 📒";

            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsJsonAsync(WhatsAppServiceUrl, new { phone = customer.PhoneNumber, message });
            return response.IsSuccessStatusCode;
        }
        catch
        {
            // Best-effort: login creation must succeed even if the WhatsApp service is
            // unreachable or not yet connected to a phone.
            return false;
        }
    }
}
