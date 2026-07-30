namespace DigitalKhata.API.DTOs.Requests;

public class CreateCustomerLoginRequestDto
{
    public string? Username { get; set; }
    public string Password { get; set; } = string.Empty;
    public bool SendWhatsApp { get; set; }
}
