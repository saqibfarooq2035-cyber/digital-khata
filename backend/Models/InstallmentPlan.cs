namespace DigitalKhata.API.Models;

public class InstallmentPlan
{
    public int Id { get; set; }
    public int SaleId { get; set; }
    public int NumberOfInstallments { get; set; }
    public decimal InstallmentAmount { get; set; }
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = "Active";
}
