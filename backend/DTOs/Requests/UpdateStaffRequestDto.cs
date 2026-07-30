namespace DigitalKhata.API.DTOs.Requests;

public class UpdateStaffRequestDto
{
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "Staff";
    public bool IsActive { get; set; } = true;
}
