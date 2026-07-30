using System.Security.Claims;
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
[Authorize(Roles = "Admin")]
public class StaffController : ControllerBase
{
    private static readonly string[] ValidRoles = { "Admin", "Staff" };

    private readonly AppDbContext _context;

    public StaffController(AppDbContext context)
    {
        _context = context;
    }

    private int? CurrentUserId =>
        int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static StaffResponseDto ToDto(User user) => new()
    {
        Id = user.Id,
        Username = user.Username,
        FullName = user.FullName,
        Role = user.Role,
        IsActive = user.IsActive,
        CreatedAt = user.CreatedAt,
        LastLoginAt = user.LastLoginAt
    };

    [HttpGet]
    public async Task<ActionResult<IEnumerable<StaffResponseDto>>> GetStaff()
    {
        var staff = await _context.Users.OrderBy(u => u.FullName).ToListAsync();
        return Ok(staff.Select(ToDto));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<StaffResponseDto>> GetStaffMember(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();
        return Ok(ToDto(user));
    }

    [HttpPost]
    public async Task<ActionResult<StaffResponseDto>> CreateStaff([FromBody] CreateStaffRequestDto request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest(new { message = "Username, password, and full name are required" });
        }

        var username = request.Username.Trim();

        if (!ValidRoles.Contains(request.Role))
        {
            return BadRequest(new { message = "Role must be Admin or Staff" });
        }

        var usernameTaken = await _context.Users.AnyAsync(u => u.Username == username);
        if (usernameTaken)
        {
            return BadRequest(new { message = "Username is already taken" });
        }

        var user = new User
        {
            Username = username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Role = request.Role,
            Permissions = "[]",
            IsActive = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetStaffMember), new { id = user.Id }, ToDto(user));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateStaff(int id, [FromBody] UpdateStaffRequestDto request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return NotFound();

        if (!ValidRoles.Contains(request.Role))
        {
            return BadRequest(new { message = "Role must be Admin or Staff" });
        }

        if (id == CurrentUserId && (!request.IsActive || request.Role != "Admin"))
        {
            return BadRequest(new { message = "You cannot deactivate or demote your own account" });
        }

        user.FullName = request.FullName;
        user.Role = request.Role;
        user.IsActive = request.IsActive;

        await _context.SaveChangesAsync();
        return Ok(ToDto(user));
    }
}
