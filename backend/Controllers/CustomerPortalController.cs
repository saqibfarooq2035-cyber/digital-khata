using DigitalKhata.API.Data;
using DigitalKhata.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DigitalKhata.API.Controllers;

[ApiController]
[Route("api/portal")]
[Authorize(Roles = "Customer")]
public class CustomerPortalController : ControllerBase
{
    private readonly AppDbContext _context;

    public CustomerPortalController(AppDbContext context)
    {
        _context = context;
    }

    private int GetCustomerId()
    {
        var claim = User.FindFirst("customerId")?.Value;
        if (string.IsNullOrEmpty(claim)) throw new UnauthorizedAccessException();
        return int.Parse(claim);
    }

    private static int CalculatePaidInstallments(Sale sale)
    {
        if (sale.InstallmentAmount <= 0)
        {
            return sale.RemainingAmount <= 0 ? sale.DurationMonths : 0;
        }

        var paidViaInstallments = Math.Max(0, sale.TotalPrice - sale.DownPayment - sale.RemainingAmount);
        var paid = (int)Math.Round(paidViaInstallments / sale.InstallmentAmount);
        return Math.Min(sale.DurationMonths, Math.Max(0, paid));
    }

    private static Sale? PickPrimarySale(List<Sale> sales)
    {
        return sales.Where(s => s.RemainingAmount > 0).OrderBy(s => s.FirstDueDate).FirstOrDefault()
            ?? sales.OrderByDescending(s => s.SaleDate).FirstOrDefault();
    }

    // ENDPOINT 1: GET /api/portal/dashboard
    [HttpGet("dashboard")]
    public async Task<ActionResult<object>> GetDashboard()
    {
        var customerId = GetCustomerId();
        var sale = await _context.Sales.FirstOrDefaultAsync(s => s.CustomerId == customerId);
        if (sale == null) return Forbid();

        var sales = await _context.Sales
            .Include(s => s.Customer)
            .Include(s => s.Product)
            .Where(s => s.CustomerId == customerId)
            .ToListAsync();

        var primarySale = PickPrimarySale(sales);
        if (primarySale == null) return Forbid();

        var today = DateTime.UtcNow.Date;
        var paidInstallments = CalculatePaidInstallments(primarySale);
        var nextDueDate = primarySale.FirstDueDate.AddMonths(paidInstallments);
        var overdueDays = (int)(today - nextDueDate.Date).TotalDays;
        var isOverdue = primarySale.RemainingAmount > 0 && overdueDays > 0;

        return Ok(new
        {
            customerName = primarySale.Customer.FullName,
            phone = primarySale.Customer.PhoneNumber,
            totalPurchase = primarySale.TotalPrice,
            totalPaid = primarySale.TotalPrice - primarySale.RemainingAmount,
            remainingBalance = primarySale.RemainingAmount,
            nextDueDate = primarySale.RemainingAmount > 0 ? nextDueDate.ToString("yyyy-MM-dd") : null,
            nextDueAmount = primarySale.RemainingAmount > 0 ? primarySale.InstallmentAmount : 0,
            isOverdue,
            overdueDays = isOverdue ? overdueDays : 0,
            totalInstallments = primarySale.DurationMonths,
            paidInstallments,
            progressPercent = primarySale.DurationMonths > 0 ? (int)Math.Round(paidInstallments * 100.0 / primarySale.DurationMonths) : 0,
            productName = primarySale.Product.Name,
            saleDate = primarySale.SaleDate.ToString("yyyy-MM-dd")
        });
    }

    // ENDPOINT 2: GET /api/portal/payments
    [HttpGet("payments")]
    public async Task<ActionResult<IEnumerable<object>>> GetPayments()
    {
        var customerId = GetCustomerId();
        var sale = await _context.Sales.FirstOrDefaultAsync(s => s.CustomerId == customerId);
        if (sale == null) return Forbid();

        var payments = await _context.Payments
            .Where(p => p.Sale.CustomerId == customerId)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();

        return Ok(payments.Select(p => new
        {
            id = p.Id,
            installmentNumber = p.InstallmentNumber,
            amountReceived = p.AmountReceived,
            paymentDate = p.PaymentDate.ToString("yyyy-MM-dd"),
            paymentMethod = p.PaymentMethod,
            paymentType = p.PaymentType,
            notes = p.Notes
        }));
    }

    // ENDPOINT 3: GET /api/portal/schedule
    [HttpGet("schedule")]
    public async Task<ActionResult<IEnumerable<object>>> GetSchedule()
    {
        var customerId = GetCustomerId();
        var sale = await _context.Sales.FirstOrDefaultAsync(s => s.CustomerId == customerId);
        if (sale == null) return Forbid();

        var sales = await _context.Sales
            .Include(s => s.Payments)
            .Where(s => s.CustomerId == customerId)
            .ToListAsync();

        var primarySale = PickPrimarySale(sales);
        if (primarySale == null) return Forbid();

        var today = DateTime.UtcNow.Date;
        var schedule = new List<object>();

        for (var i = 1; i <= primarySale.DurationMonths; i++)
        {
            var dueDate = primarySale.FirstDueDate.AddMonths(i - 1).Date;
            var payment = primarySale.Payments.FirstOrDefault(p => p.InstallmentNumber == i);

            string status;
            if (payment != null) status = "Paid";
            else if (dueDate < today) status = "Overdue";
            else if (dueDate == today) status = "Due Today";
            else status = "Upcoming";

            schedule.Add(new
            {
                installmentNumber = i,
                amount = primarySale.InstallmentAmount,
                dueDate = dueDate.ToString("yyyy-MM-dd"),
                status,
                paidDate = payment?.PaymentDate.ToString("yyyy-MM-dd"),
                paidAmount = payment?.AmountReceived,
                paidMethod = payment?.PaymentMethod
            });
        }

        return Ok(schedule);
    }

    // ENDPOINT 4: GET /api/portal/receipts
    [HttpGet("receipts")]
    public async Task<ActionResult<IEnumerable<object>>> GetReceipts()
    {
        var customerId = GetCustomerId();
        var sale = await _context.Sales.FirstOrDefaultAsync(s => s.CustomerId == customerId);
        if (sale == null) return Forbid();

        var payments = await _context.Payments
            .Where(p => p.Sale.CustomerId == customerId)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();

        return Ok(payments.Select(p => new
        {
            id = p.Id,
            receiptNumber = $"RCP-{p.PaymentDate.Year}-{p.Id:D4}",
            date = p.PaymentDate.ToString("yyyy-MM-dd"),
            amount = p.AmountReceived,
            method = p.PaymentMethod,
            installmentNumber = p.InstallmentNumber
        }));
    }

    // ENDPOINT 5: GET /api/portal/receipt/{paymentId}
    [HttpGet("receipt/{paymentId:int}")]
    public async Task<ActionResult<object>> GetReceiptDetail(int paymentId)
    {
        var customerId = GetCustomerId();
        var sale = await _context.Sales.FirstOrDefaultAsync(s => s.CustomerId == customerId);
        if (sale == null) return Forbid();

        var payment = await _context.Payments
            .Include(p => p.Sale).ThenInclude(s => s.Customer)
            .Include(p => p.Sale).ThenInclude(s => s.Product)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        // Ownership check: this payment must belong to a sale owned by THIS customer,
        // not just "this customer has some sale somewhere" — prevents guessing another
        // customer's paymentId.
        if (payment == null || payment.Sale.CustomerId != customerId)
        {
            return Forbid();
        }

        var paymentSale = payment.Sale;
        var paidToDate = await _context.Payments
            .Where(p => p.SaleId == paymentSale.Id && p.InstallmentNumber <= payment.InstallmentNumber)
            .SumAsync(p => p.AmountReceived);

        var remainingBalance = Math.Max(0, paymentSale.TotalPrice - paymentSale.DownPayment - paidToDate);
        var nextDueDate = paymentSale.FirstDueDate.AddMonths(payment.InstallmentNumber);

        return Ok(new
        {
            receiptNumber = $"RCP-{payment.PaymentDate.Year}-{payment.Id:D4}",
            date = payment.PaymentDate.ToString("yyyy-MM-dd"),
            customerName = paymentSale.Customer.FullName,
            customerPhone = paymentSale.Customer.PhoneNumber,
            customerCnic = paymentSale.Customer.CNIC,
            productName = paymentSale.Product.Name,
            totalPrice = paymentSale.TotalPrice,
            installmentPlan = $"Rs. {paymentSale.InstallmentAmount:N0} x {paymentSale.DurationMonths} months",
            installmentNumber = payment.InstallmentNumber,
            totalInstallments = paymentSale.DurationMonths,
            amountReceived = payment.AmountReceived,
            paymentMethod = payment.PaymentMethod,
            remainingBalance,
            nextDueDate = remainingBalance > 0 ? nextDueDate.ToString("yyyy-MM-dd") : null
        });
    }
}
