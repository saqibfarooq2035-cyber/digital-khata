namespace DigitalKhata.API.Services;

public class FileUploadService
{
    private readonly string _uploadPath;
    private readonly string _baseUrl;

    public FileUploadService(IWebHostEnvironment env, IConfiguration config)
    {
        _uploadPath = Path.Combine(env.WebRootPath, "uploads", "payment-receipts");
        _baseUrl = config["AppSettings:BaseUrl"] ?? "http://localhost:5000";
        Directory.CreateDirectory(_uploadPath);
    }

    public async Task<string> SaveReceiptImageAsync(IFormFile file)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("No file provided");

        if (file.Length > 5 * 1024 * 1024) // 5MB limit
            throw new ArgumentException("File too large. Maximum 5MB allowed.");

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/jpg", "application/pdf" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            throw new ArgumentException("Invalid file type. Only JPG, PNG, PDF allowed.");

        var extension = Path.GetExtension(file.FileName);
        var fileName = $"receipt_{DateTime.Now:yyyyMMdd}_{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(_uploadPath, fileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await file.CopyToAsync(stream);

        return $"{_baseUrl}/uploads/payment-receipts/{fileName}";
    }

    public void DeleteReceiptImage(string imageUrl)
    {
        if (string.IsNullOrEmpty(imageUrl)) return;
        var fileName = Path.GetFileName(imageUrl);
        var filePath = Path.Combine(_uploadPath, fileName);
        if (File.Exists(filePath)) File.Delete(filePath);
    }
}
