namespace DigitalKhata.API.DTOs.Responses;

public class AuthResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Permissions { get; set; } = "[]";
    public int? CustomerId { get; set; }
}
