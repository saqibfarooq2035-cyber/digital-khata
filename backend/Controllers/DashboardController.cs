using DigitalKhata.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DigitalKhata.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _context;

    public DashboardController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("stats")]
    public async Task<ActionResult<object>> GetStats()
    {
        var customers = await _context.Customers.CountAsync();
        var sales = await _context.Sales.SumAsync(s => (decimal?)s.TotalPrice) ?? 0;
        var outstanding = await _context.Sales.SumAsync(s => s.RemainingAmount);
        var todayCollection = await _context.Payments.Where(p => p.PaymentDate.Date == DateTime.UtcNow.Date).SumAsync(p => p.AmountReceived);

        return Ok(new
        {
            totalCustomers = customers,
            totalSales = sales,
            outstanding,
            todayCollection
        });
    }

    [HttpGet("monthly-revenue")]
    public async Task<ActionResult<IEnumerable<object>>> GetMonthlyRevenue()
    {
        var now = DateTime.UtcNow;
        var grouped = await _context.Payments
            .Where(p => p.PaymentDate >= now.AddMonths(-5).Date)
            .GroupBy(p => new { p.PaymentDate.Year, p.PaymentDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(p => p.AmountReceived) })
            .ToListAsync();

        var data = grouped
            .OrderBy(x => x.Year).ThenBy(x => x.Month)
            .Select(x => new { month = new DateTime(x.Year, x.Month, 1).ToString("MMM"), revenue = x.Revenue });

        return Ok(data);
    }

    [HttpGet("overdue-customers")]
    public async Task<ActionResult<IEnumerable<object>>> GetOverdueCustomers()
    {
        var sales = await _context.Sales
            .Include(s => s.Customer)
            .Where(s => s.RemainingAmount > 0)
            .ToListAsync();

        var today = DateTime.UtcNow.Date;

        var overdueCustomers = sales
            .Select(s =>
            {
                var paidInstallments = s.InstallmentAmount > 0
                    ? Math.Min(s.DurationMonths, Math.Max(0, (int)Math.Round((s.TotalPrice - s.DownPayment - s.RemainingAmount) / s.InstallmentAmount)))
                    : (s.RemainingAmount <= 0 ? s.DurationMonths : 0);
                var nextDueDate = s.FirstDueDate.AddMonths(paidInstallments);
                var daysOverdue = (int)(today - nextDueDate.Date).TotalDays;

                return new
                {
                    CustomerId = s.CustomerId,
                    CustomerName = s.Customer.FullName,
                    PhoneNumber = s.Customer.PhoneNumber,
                    RemainingAmount = s.RemainingAmount,
                    InstallmentAmount = s.InstallmentAmount,
                    FirstDueDate = s.FirstDueDate,
                    NextDueDate = nextDueDate,
                    DaysOverdue = daysOverdue
                };
            })
            .Where(x => x.DaysOverdue > 0)
            .OrderByDescending(x => x.DaysOverdue)
            .Take(5);

        return Ok(overdueCustomers);
    }
}
