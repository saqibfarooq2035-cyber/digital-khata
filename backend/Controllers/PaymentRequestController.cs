using System.Net.Http.Json;
using System.Security.Claims;
using DigitalKhata.API.Data;
using DigitalKhata.API.DTOs.Requests;
using DigitalKhata.API.Models;
using DigitalKhata.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DigitalKhata.API.Controllers;

[ApiController]
[Route("api/payment-requests")]
public class PaymentRequestController : ControllerBase
{
    private const string WhatsAppServiceUrl = "http://localhost:3001/api/whatsapp/send-single";

    private readonly AppDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly FileUploadService _fileUploadService;

    public PaymentRequestController(AppDbContext context, IHttpClientFactory httpClientFactory, IConfiguration configuration, FileUploadService fileUploadService)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _fileUploadService = fileUploadService;
    }

    private int GetCustomerId()
    {
        var claim = User.FindFirst("customerId")?.Value;
        if (string.IsNullOrEmpty(claim)) throw new UnauthorizedAccessException();
        return int.Parse(claim);
    }

    private int GetUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    private string GetUserFullName() => User.FindFirst("fullName")?.Value ?? User.FindFirst(ClaimTypes.Name)?.Value ?? string.Empty;

    // ═══════════════════════ CUSTOMER ENDPOINTS ═══════════════════════

    // ENDPOINT 1: GET /api/payment-requests/shop-accounts
    [HttpGet("shop-accounts")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<IEnumerable<object>>> GetShopAccounts()
    {
        var accounts = await _context.ShopPaymentAccounts
            .Where(a => a.IsActive)
            .OrderBy(a => a.DisplayOrder)
            .ToListAsync();

        return Ok(accounts.Select(a => new
        {
            id = a.Id,
            accountType = a.AccountType,
            accountTitle = a.AccountTitle,
            accountNumber = a.AccountNumber,
            bankName = a.BankName,
            iban = a.IBAN,
            instructions = a.Instructions
        }));
    }

    // ENDPOINT 2: POST /api/payment-requests/submit
    [HttpPost("submit")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<object>> SubmitPaymentRequest([FromForm] SubmitPaymentRequestDto request)
    {
        var customerId = GetCustomerId();

        var sale = await _context.Sales
            .Include(s => s.Customer)
            .Where(s => s.CustomerId == customerId && s.RemainingAmount > 0)
            .OrderBy(s => s.FirstDueDate)
            .FirstOrDefaultAsync();

        if (sale == null)
        {
            return BadRequest(new { message = "No active installment plan found for your account." });
        }

        var duplicateExists = await _context.PaymentRequests.AnyAsync(pr =>
            pr.SaleId == sale.Id && pr.InstallmentNumber == request.InstallmentNumber && pr.Status == "Pending");
        if (duplicateExists)
        {
            return BadRequest(new { message = $"A pending request already exists for installment #{request.InstallmentNumber}" });
        }

        string? receiptImagePath = null;
        if (request.ReceiptImage != null && request.ReceiptImage.Length > 0)
        {
            try
            {
                receiptImagePath = await _fileUploadService.SaveReceiptImageAsync(request.ReceiptImage);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        var paymentRequest = new PaymentRequest
        {
            SaleId = sale.Id,
            CustomerId = customerId,
            InstallmentNumber = request.InstallmentNumber,
            Amount = request.Amount,
            PaymentMethod = request.PaymentMethod,
            TransactionId = request.TransactionId,
            ReceiptImagePath = receiptImagePath,
            Notes = request.Notes,
            Status = "Pending",
            RequestedAt = DateTime.UtcNow
        };

        _context.PaymentRequests.Add(paymentRequest);
        await _context.SaveChangesAsync();

        var adminPhone = _configuration["ShopSettings:AdminWhatsApp"];
        var adminMessage = "💳 نئی ادائیگی کی درخواست!\n\n" +
            $"Customer: {sale.Customer.FullName}\n" +
            $"Installment: #{request.InstallmentNumber}\n" +
            $"Amount: Rs. {request.Amount:N0}\n" +
            $"Method: {request.PaymentMethod}\n" +
            $"Transaction ID: {request.TransactionId}\n\n" +
            "Please review and approve.\n— Digital Khata 📒";
        await TrySendWhatsAppAsync(adminPhone, adminMessage);

        return Ok(new
        {
            success = true,
            requestId = paymentRequest.Id,
            message = "Payment request submitted! Admin will verify and approve shortly."
        });
    }

    // ENDPOINT 3: GET /api/payment-requests/my-requests
    [HttpGet("my-requests")]
    [Authorize(Roles = "Customer")]
    public async Task<ActionResult<IEnumerable<object>>> GetMyRequests()
    {
        var customerId = GetCustomerId();

        var requests = await _context.PaymentRequests
            .Where(pr => pr.CustomerId == customerId)
            .OrderByDescending(pr => pr.RequestedAt)
            .ToListAsync();

        return Ok(requests.Select(pr => new
        {
            id = pr.Id,
            installmentNumber = pr.InstallmentNumber,
            amount = pr.Amount,
            paymentMethod = pr.PaymentMethod,
            transactionId = pr.TransactionId,
            status = pr.Status,
            requestedAt = pr.RequestedAt,
            reviewedAt = pr.ReviewedAt,
            rejectionReason = pr.RejectionReason,
            receiptImageUrl = pr.ReceiptImagePath
        }));
    }

    // ═══════════════════════ ADMIN/STAFF ENDPOINTS ═══════════════════════

    // ENDPOINT 4: GET /api/payment-requests/pending
    [HttpGet("pending")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<IEnumerable<object>>> GetPending()
    {
        var requests = await _context.PaymentRequests
            .Include(pr => pr.Customer)
            .Include(pr => pr.Sale).ThenInclude(s => s.Product)
            .Where(pr => pr.Status == "Pending")
            .OrderBy(pr => pr.RequestedAt)
            .ToListAsync();

        return Ok(requests.Select(pr => new
        {
            id = pr.Id,
            customerId = pr.CustomerId,
            customerName = pr.Customer.FullName,
            customerPhone = pr.Customer.PhoneNumber,
            productName = pr.Sale.Product.Name,
            installmentNumber = pr.InstallmentNumber,
            totalInstallments = pr.Sale.DurationMonths,
            amount = pr.Amount,
            paymentMethod = pr.PaymentMethod,
            transactionId = pr.TransactionId,
            receiptImageUrl = pr.ReceiptImagePath,
            requestedAt = pr.RequestedAt,
            notes = pr.Notes
        }));
    }

    // ENDPOINT 5: GET /api/payment-requests/all
    [HttpGet("all")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<object>> GetAll([FromQuery] string? status, [FromQuery] int? customerId, [FromQuery] int page = 1, [FromQuery] int limit = 20)
    {
        page = Math.Max(1, page);
        limit = Math.Clamp(limit, 1, 100);

        var query = _context.PaymentRequests
            .Include(pr => pr.Customer)
            .Include(pr => pr.Sale).ThenInclude(s => s.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(pr => pr.Status == status);
        }

        if (customerId.HasValue)
        {
            query = query.Where(pr => pr.CustomerId == customerId.Value);
        }

        var total = await query.CountAsync();
        var requests = await query
            .OrderByDescending(pr => pr.RequestedAt)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return Ok(new
        {
            items = requests.Select(pr => new
            {
                id = pr.Id,
                customerId = pr.CustomerId,
                customerName = pr.Customer.FullName,
                customerPhone = pr.Customer.PhoneNumber,
                productName = pr.Sale.Product.Name,
                installmentNumber = pr.InstallmentNumber,
                amount = pr.Amount,
                paymentMethod = pr.PaymentMethod,
                transactionId = pr.TransactionId,
                receiptImageUrl = pr.ReceiptImagePath,
                status = pr.Status,
                requestedAt = pr.RequestedAt,
                reviewedAt = pr.ReviewedAt,
                rejectionReason = pr.RejectionReason,
                notes = pr.Notes
            }),
            total,
            page,
            limit,
            totalPages = (int)Math.Ceiling(total / (double)limit)
        });
    }

    // ENDPOINT 6: POST /api/payment-requests/{id}/approve
    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<object>> Approve(int id)
    {
        var request = await _context.PaymentRequests
            .Include(pr => pr.Sale).ThenInclude(s => s.Customer)
            .FirstOrDefaultAsync(pr => pr.Id == id);

        if (request == null) return NotFound(new { message = "Payment request not found" });
        if (request.Status != "Pending") return BadRequest(new { message = "This request has already been reviewed" });

        request.Status = "Approved";
        request.ReviewedAt = DateTime.UtcNow;
        request.ReviewedByUserId = GetUserId();

        var sale = request.Sale;
        var payment = new Payment
        {
            SaleId = sale.Id,
            InstallmentNumber = request.InstallmentNumber,
            AmountReceived = request.Amount,
            PaymentDate = DateTime.UtcNow,
            PaymentMethod = request.PaymentMethod,
            PaymentType = "Full",
            Notes = $"Approved from customer portal. TXN: {request.TransactionId}",
            ReceivedBy = GetUserFullName()
        };
        _context.Payments.Add(payment);

        sale.RemainingAmount = Math.Max(0, sale.RemainingAmount - request.Amount);
        sale.Status = sale.RemainingAmount <= 0 ? "Completed" : sale.Status;

        await _context.SaveChangesAsync();

        var customerMessage = "✅ ادائیگی منظور ہو گئی!\n\n" +
            $"{sale.Customer.FullName} صاحب، آپ کی Rs. {request.Amount:N0} کی ادائیگی منظور کر لی گئی ہے۔\n\n" +
            $"Installment #{request.InstallmentNumber} ✅ Approved\n" +
            $"Date: {payment.PaymentDate:yyyy-MM-dd}\n\n" +
            $"باقی رقم: Rs. {sale.RemainingAmount:N0}\n" +
            "شکریہ! — Digital Khata 📒";
        await TrySendWhatsAppAsync(sale.Customer.PhoneNumber, customerMessage);

        return Ok(new { success = true, message = "Payment approved and recorded!" });
    }

    // ENDPOINT 7: POST /api/payment-requests/{id}/reject
    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = "Admin,Staff")]
    public async Task<ActionResult<object>> Reject(int id, [FromBody] RejectPaymentRequestDto request)
    {
        var paymentRequest = await _context.PaymentRequests
            .Include(pr => pr.Sale).ThenInclude(s => s.Customer)
            .FirstOrDefaultAsync(pr => pr.Id == id);

        if (paymentRequest == null) return NotFound(new { message = "Payment request not found" });
        if (paymentRequest.Status != "Pending") return BadRequest(new { message = "This request has already been reviewed" });

        paymentRequest.Status = "Rejected";
        paymentRequest.RejectionReason = request.Reason;
        paymentRequest.ReviewedAt = DateTime.UtcNow;
        paymentRequest.ReviewedByUserId = GetUserId();

        await _context.SaveChangesAsync();

        var customer = paymentRequest.Sale.Customer;
        var customerMessage = "❌ ادائیگی مسترد ہو گئی\n\n" +
            $"{customer.FullName} صاحب، آپ کی Rs. {paymentRequest.Amount:N0} کی درخواست مسترد کر دی گئی۔\n\n" +
            $"وجہ: {request.Reason}\n\n" +
            "براہ کرم دوبارہ کوشش کریں یا ہم سے رابطہ کریں۔\n" +
            "📞 0300-1234567\n" +
            "— Digital Khata 📒";
        await TrySendWhatsAppAsync(customer.PhoneNumber, customerMessage);

        return Ok(new { success = true, message = "Payment request rejected" });
    }

    // ═══════════════════════ ADMIN SETTINGS ENDPOINTS ═══════════════════════

    // ENDPOINT 8: GET /api/payment-requests/shop-accounts/manage
    [HttpGet("shop-accounts/manage")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<object>>> GetShopAccountsForManagement()
    {
        var accounts = await _context.ShopPaymentAccounts.OrderBy(a => a.DisplayOrder).ToListAsync();
        return Ok(accounts.Select(a => new
        {
            id = a.Id,
            accountType = a.AccountType,
            accountTitle = a.AccountTitle,
            accountNumber = a.AccountNumber,
            bankName = a.BankName,
            iban = a.IBAN,
            instructions = a.Instructions,
            isActive = a.IsActive,
            displayOrder = a.DisplayOrder
        }));
    }

    // ENDPOINT 9: POST /api/payment-requests/shop-accounts
    [HttpPost("shop-accounts")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<object>> CreateShopAccount([FromBody] ShopPaymentAccountRequestDto request)
    {
        var account = new ShopPaymentAccount
        {
            AccountType = request.AccountType,
            AccountTitle = request.AccountTitle,
            AccountNumber = request.AccountNumber,
            BankName = request.BankName,
            IBAN = request.IBAN,
            Instructions = request.Instructions,
            IsActive = request.IsActive,
            DisplayOrder = request.DisplayOrder
        };

        _context.ShopPaymentAccounts.Add(account);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, id = account.Id });
    }

    // ENDPOINT 10: PUT /api/payment-requests/shop-accounts/{id}
    [HttpPut("shop-accounts/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateShopAccount(int id, [FromBody] ShopPaymentAccountRequestDto request)
    {
        var account = await _context.ShopPaymentAccounts.FindAsync(id);
        if (account == null) return NotFound(new { message = "Payment account not found" });

        account.AccountType = request.AccountType;
        account.AccountTitle = request.AccountTitle;
        account.AccountNumber = request.AccountNumber;
        account.BankName = request.BankName;
        account.IBAN = request.IBAN;
        account.Instructions = request.Instructions;
        account.IsActive = request.IsActive;
        account.DisplayOrder = request.DisplayOrder;

        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = "Payment account updated" });
    }

    // ENDPOINT 11: DELETE /api/payment-requests/shop-accounts/{id}
    [HttpDelete("shop-accounts/{id:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeactivateShopAccount(int id)
    {
        var account = await _context.ShopPaymentAccounts.FindAsync(id);
        if (account == null) return NotFound(new { message = "Payment account not found" });

        account.IsActive = false;
        await _context.SaveChangesAsync();

        return Ok(new { success = true, message = "Payment account deactivated" });
    }

    private async Task<bool> TrySendWhatsAppAsync(string? phone, string message)
    {
        if (string.IsNullOrWhiteSpace(phone)) return false;

        try
        {
            var client = _httpClientFactory.CreateClient();
            var response = await client.PostAsJsonAsync(WhatsAppServiceUrl, new { phone, message });
            return response.IsSuccessStatusCode;
        }
        catch
        {
            // Best-effort: approvals/rejections/submissions must succeed even if the
            // WhatsApp service is unreachable or not yet connected to a phone.
            return false;
        }
    }
}
