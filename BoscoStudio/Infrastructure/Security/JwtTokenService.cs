using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Domain.Entities;
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
    Task ChangePasswordAsync(int ownerId, ChangePasswordRequest request, CancellationToken ct);
    Task<OwnerDto> GetProfileAsync(int ownerId, CancellationToken ct);
    Task<BrandingDto> GetBrandingAsync(CancellationToken ct);
    /// <summary>Changes the signed-in owner's username / name / email and returns a fresh token carrying the new name.</summary>
    Task<LoginResponse> UpdateProfileAsync(int ownerId, UpdateProfileRequest request, CancellationToken ct);
}

/// <summary>Owner sign-in (BCrypt password check -> JWT) and the signed-in owner's own account.</summary>
public class AuthService(PhotoStudioDbContext db, Microsoft.Extensions.Options.IOptions<JwtOptions> options) : IAuthService
{
    private readonly JwtOptions _jwt = options.Value;

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var owner = await db.OwnerAccounts.AsNoTracking().FirstOrDefaultAsync(o => o.Username == request.Username, ct);

        // Verify even when the user is unknown so response time doesn't reveal valid usernames.
        const string dummyHash = "$2a$11$gYvBkSu1PtbHnnCCa2/oF.4Vn98BiWLXMU82ci146mzkxF7aAy8j.";
        bool ok = BCrypt.Net.BCrypt.Verify(request.Password, owner?.PasswordHash ?? dummyHash);
        return owner is null || !ok ? null : Issue(owner);
    }

    public async Task ChangePasswordAsync(int ownerId, ChangePasswordRequest request, CancellationToken ct)
    {
        var owner = await FindAsync(ownerId, ct);
        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, owner.PasswordHash))
            throw new BusinessRuleException("The current password is incorrect.");

        owner.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, 11);
        await db.SaveChangesAsync(ct);
    }

    public async Task<BrandingDto> GetBrandingAsync(CancellationToken ct)
    {
        var s = await db.StudioSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        return new BrandingDto(s?.StudioName ?? "Studio", s?.Tagline);
    }

    public async Task<OwnerDto> GetProfileAsync(int ownerId, CancellationToken ct) =>
        ToDto(await FindAsync(ownerId, ct), ownerId);

    public async Task<LoginResponse> UpdateProfileAsync(int ownerId, UpdateProfileRequest r, CancellationToken ct)
    {
        var owner = await FindAsync(ownerId, ct);
        if (!BCrypt.Net.BCrypt.Verify(r.CurrentPassword, owner.PasswordHash))
            throw new BusinessRuleException("The current password is incorrect.");

        string username = r.Username.Trim();
        if (await db.OwnerAccounts.AnyAsync(o => o.Username == username && o.OwnerId != ownerId, ct))
            throw new ConflictException($"The username '{username}' is already taken.");

        owner.Username = username;
        owner.FullName = r.FullName.Trim();
        owner.Email = string.IsNullOrWhiteSpace(r.Email) ? null : r.Email.Trim();
        await db.SaveChangesAsync(ct);
        return Issue(owner);
    }

    private async Task<OwnerAccount> FindAsync(int ownerId, CancellationToken ct) =>
        await db.OwnerAccounts.FirstOrDefaultAsync(o => o.OwnerId == ownerId, ct) ?? throw new NotFoundException("Owner", ownerId);

    private static OwnerDto ToDto(OwnerAccount o, int currentOwnerId) =>
        new(o.OwnerId, o.Username, o.FullName, o.Email, o.Role, o.CreatedAt, o.OwnerId == currentOwnerId, AppPermissions.Effective(o.Role, o.Permissions));

    private LoginResponse Issue(OwnerAccount owner)
    {
        var expires = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SigningKey));
        var permissions = AppPermissions.Effective(owner.Role, owner.Permissions);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, owner.OwnerId.ToString()), new(ClaimTypes.Name, owner.Username), new(ClaimTypes.Role, owner.Role),
        };
        claims.AddRange(permissions.Select(p => new Claim(AppPermissions.ClaimType, p)));
        var token = new JwtSecurityToken(
            _jwt.Issuer, _jwt.Audience,
            claims,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), expires, owner.FullName, owner.Role, permissions);
    }
}
