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
public class PaymentsController : ControllerBase
{
    private readonly AppDbContext _context;

    public PaymentsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetPayments([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var query = _context.Payments.AsQueryable();
        if (from.HasValue) query = query.Where(p => p.PaymentDate >= from.Value);
        if (to.HasValue) query = query.Where(p => p.PaymentDate <= to.Value);

        var payments = await query.OrderByDescending(p => p.PaymentDate).ToListAsync();
        return Ok(payments.Select(p => new PaymentResponseDto
        {
            Id = p.Id,
            SaleId = p.SaleId,
            InstallmentNumber = p.InstallmentNumber,
            AmountReceived = p.AmountReceived,
            PaymentDate = p.PaymentDate,
            PaymentType = p.PaymentType,
            PaymentMethod = p.PaymentMethod,
            Notes = p.Notes,
            ReceivedBy = p.ReceivedBy
        }));
    }

    [HttpGet("sale/{saleId:int}")]
    public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetPaymentsBySale(int saleId)
    {
        var payments = await _context.Payments.Where(p => p.SaleId == saleId).OrderBy(p => p.InstallmentNumber).ToListAsync();
        return Ok(payments.Select(p => new PaymentResponseDto
        {
            Id = p.Id,
            SaleId = p.SaleId,
            InstallmentNumber = p.InstallmentNumber,
            AmountReceived = p.AmountReceived,
            PaymentDate = p.PaymentDate,
            PaymentType = p.PaymentType,
            PaymentMethod = p.PaymentMethod,
            Notes = p.Notes,
            ReceivedBy = p.ReceivedBy
        }));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<PaymentResponseDto>> CreatePayment([FromBody] CreatePaymentRequestDto request)
    {
        var sale = await _context.Sales.FindAsync(request.SaleId);
        if (sale == null) return BadRequest();

        var payment = new Payment
        {
            SaleId = request.SaleId,
            InstallmentNumber = request.InstallmentNumber,
            AmountReceived = request.AmountReceived,
            PaymentDate = request.PaymentDate,
            PaymentType = request.PaymentType,
            PaymentMethod = request.PaymentMethod,
            Notes = request.Notes,
            ReceivedBy = request.ReceivedBy
        };

        _context.Payments.Add(payment);
        sale.RemainingAmount = Math.Max(0, sale.RemainingAmount - request.AmountReceived);
        sale.Status = sale.RemainingAmount <= 0 ? "Completed" : sale.Status;
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPaymentsBySale), new { saleId = payment.SaleId }, new PaymentResponseDto
        {
            Id = payment.Id,
            SaleId = payment.SaleId,
            InstallmentNumber = payment.InstallmentNumber,
            AmountReceived = payment.AmountReceived,
            PaymentDate = payment.PaymentDate,
            PaymentType = payment.PaymentType,
            PaymentMethod = payment.PaymentMethod,
            Notes = payment.Notes,
            ReceivedBy = payment.ReceivedBy
        });
    }

    [HttpGet("today")]
    public async Task<ActionResult<IEnumerable<PaymentResponseDto>>> GetTodayPayments()
    {
        var today = DateTime.UtcNow.Date;
        var payments = await _context.Payments.Where(p => p.PaymentDate.Date == today).ToListAsync();
        return Ok(payments.Select(p => new PaymentResponseDto
        {
            Id = p.Id,
            SaleId = p.SaleId,
            InstallmentNumber = p.InstallmentNumber,
            AmountReceived = p.AmountReceived,
            PaymentDate = p.PaymentDate,
            PaymentType = p.PaymentType,
            PaymentMethod = p.PaymentMethod,
            Notes = p.Notes,
            ReceivedBy = p.ReceivedBy
        }));
    }

    [HttpGet("summary")]
    public async Task<ActionResult<object>> GetPaymentSummary()
    {
        var payments = await _context.Payments.ToListAsync();
        var sales = await _context.Sales.ToListAsync();
        return Ok(new
        {
            totalCollected = payments.Sum(p => p.AmountReceived),
            outstanding = sales.Sum(s => s.RemainingAmount),
            overdue = sales.Count(s => s.Status == "Overdue" || s.RemainingAmount > 0)
        });
    }
}
