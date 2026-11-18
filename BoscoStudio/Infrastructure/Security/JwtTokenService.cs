using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace BoscoStudio.Infrastructure.Security;

public class JwtOptions
{
    public string Issuer { get; set; } = "";
    public string Audience { get; set; } = "";
    public string SigningKey { get; set; } = "";
    public int ExpiryMinutes { get; set; } = 480;
}

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct);
}

/// <summary>Verifies the single owner's BCrypt password and issues a JWT.</summary>
public class AuthService(PhotoStudioDbContext db, Microsoft.Extensions.Options.IOptions<JwtOptions> options) : IAuthService
{
    private readonly JwtOptions _jwt = options.Value;

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var owner = await db.OwnerAccounts.AsNoTracking().FirstOrDefaultAsync(o => o.Username == request.Username, ct);

        // Verify even when the user is unknown so response time doesn't reveal valid usernames.
        const string dummyHash = "$2a$11$gYvBkSu1PtbHnnCCa2/oF.4Vn98BiWLXMU82ci146mzkxF7aAy8j.";
        bool ok = BCrypt.Net.BCrypt.Verify(request.Password, owner?.PasswordHash ?? dummyHash);
        if (owner is null || !ok) return null;

        var expires = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SigningKey));
        var token = new JwtSecurityToken(
            _jwt.Issuer, _jwt.Audience,
            [new Claim(ClaimTypes.NameIdentifier, owner.OwnerId.ToString()), new Claim(ClaimTypes.Name, owner.Username)],
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), expires, owner.FullName);
    }
}
