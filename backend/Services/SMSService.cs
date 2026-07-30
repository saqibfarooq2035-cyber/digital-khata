namespace DigitalKhata.API.Services;

public class SMSService
{
    public bool Send(string phone, string message)
    {
        // Placeholder for SMS integration.
        Console.WriteLine($"Sending SMS to {phone}: {message}");
        return true;
    }
}
