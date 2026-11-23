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
    Task LogoutAsync(int ownerId, string username, CancellationToken ct);
    Task ChangePasswordAsync(int ownerId, ChangePasswordRequest request, CancellationToken ct);
    Task<OwnerDto> GetProfileAsync(int ownerId, CancellationToken ct);
    Task<BrandingDto> GetBrandingAsync(CancellationToken ct);
    /// <summary>Changes the signed-in owner's username / name / email and returns a fresh token carrying the new name.</summary>
    Task<LoginResponse> UpdateProfileAsync(int ownerId, UpdateProfileRequest request, CancellationToken ct);
}

/// <summary>Owner sign-in (BCrypt password check -> JWT) and the signed-in owner's own account.</summary>
public class AuthService(
    PhotoStudioDbContext db, Microsoft.Extensions.Options.IOptions<JwtOptions> options, IHttpContextAccessor http,
    ILogger<AuthService> logger) : IAuthService
{
    private readonly JwtOptions _jwt = options.Value;

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var owner = await db.OwnerAccounts.AsNoTracking().FirstOrDefaultAsync(o => o.Username == request.Username, ct);

        // Verify even when the user is unknown so response time doesn't reveal valid usernames.
        const string dummyHash = "$2a$11$gYvBkSu1PtbHnnCCa2/oF.4Vn98BiWLXMU82ci146mzkxF7aAy8j.";
        bool ok = BCrypt.Net.BCrypt.Verify(request.Password, owner?.PasswordHash ?? dummyHash);

        if (owner is null || !ok)
        {
            await RecordAsync(owner?.OwnerId, owner?.StudioId, owner?.Username ?? request.Username, LoginEvents.LoginFailed, ct);
            return null;
        }
        var studio = owner.StudioId is int sid ? await db.Studios.AsNoTracking().FirstOrDefaultAsync(s => s.StudioId == sid, ct) : null;
        if (studio is { IsActive: false })
        {
            await RecordAsync(owner, LoginEvents.LoginFailed, ct);
            throw new BusinessRuleException("This studio's access is switched off. Please contact support.");
        }
        await RecordAsync(owner, LoginEvents.Login, ct);
        return await IssueAsync(owner, studio?.StudioName, ct);
    }

    public async Task LogoutAsync(int ownerId, string username, CancellationToken ct)
    {
        int? studioId = await db.OwnerAccounts.Where(o => o.OwnerId == ownerId).Select(o => o.StudioId).FirstOrDefaultAsync(ct);
        await RecordAsync(ownerId, studioId, username, LoginEvents.Logout, ct);
    }

    private Task RecordAsync(OwnerAccount owner, string eventType, CancellationToken ct) =>
        RecordAsync(owner.OwnerId, owner.StudioId, owner.Username, eventType, ct);

    /// <summary>Appends one sign-in event. Text from the client is trimmed to the column sizes so a long value can't break the insert.</summary>
    private async Task RecordAsync(int? ownerId, int? studioId, string username, string eventType, CancellationToken ct)
    {
        static string? Cut(string? s, int max) => string.IsNullOrEmpty(s) ? null : s.Length <= max ? s : s[..max];
        var ctx = http.HttpContext;
        var audit = new LoginAudit
        {
            OwnerId = ownerId,
            StudioId = studioId,
            Username = Cut(username, 50) ?? "",
            EventType = eventType,
            OccurredAt = DateTime.UtcNow,
            IpAddress = Cut(ctx?.Connection.RemoteIpAddress?.ToString(), 45),
            UserAgent = Cut(ctx?.Request.Headers.UserAgent.ToString(), 300),
        };
        // The history is best-effort: a logging problem must never stop an owner from signing in or out.
        try
        {
            db.LoginAudits.Add(audit);
            await db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            db.Entry(audit).State = EntityState.Detached;
            logger.LogError(ex, "Could not record {Event} for '{Username}'.", eventType, audit.Username);
        }
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
        // Public page: nobody is signed in, so no studio is known yet. The studio's own name shows after sign-in.
        await Task.CompletedTask;
        return new BrandingDto("Photo Studio Manager", "Orders, albums and payments for your studio");
    }

    public async Task<OwnerDto> GetProfileAsync(int ownerId, CancellationToken ct) =>
        await ToDtoAsync(await FindAsync(ownerId, ct), ownerId, ct);

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
        return await IssueAsync(owner, null, ct);
    }

    private async Task<OwnerAccount> FindAsync(int ownerId, CancellationToken ct) =>
        await db.OwnerAccounts.FirstOrDefaultAsync(o => o.OwnerId == ownerId, ct) ?? throw new NotFoundException("Owner", ownerId);

    private async Task<string?> RoleDefaultsAsync(string role, CancellationToken ct) =>
        await db.Roles.IgnoreQueryFilters().AsNoTracking().Where(r => r.RoleName == role).Select(r => r.Permissions).FirstOrDefaultAsync(ct);

    private async Task<string?> StudioNameAsync(int? studioId, CancellationToken ct) =>
        studioId is int id ? await db.Studios.AsNoTracking().Where(s => s.StudioId == id).Select(s => s.StudioName).FirstOrDefaultAsync(ct) : null;

    private async Task<OwnerDto> ToDtoAsync(OwnerAccount o, int currentOwnerId, CancellationToken ct) =>
        new(o.OwnerId, o.Username, o.FullName, o.Email, o.Role, o.CreatedAt, o.OwnerId == currentOwnerId,
            AppPermissions.Effective(o.Role, await RoleDefaultsAsync(o.Role, ct), o.Permissions), o.StudioId, await StudioNameAsync(o.StudioId, ct));

    private async Task<LoginResponse> IssueAsync(OwnerAccount owner, string? studioName, CancellationToken ct)
    {
        studioName ??= await StudioNameAsync(owner.StudioId, ct);
        var expires = DateTime.UtcNow.AddMinutes(_jwt.ExpiryMinutes);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.SigningKey));
        var permissions = AppPermissions.Effective(owner.Role, await RoleDefaultsAsync(owner.Role, ct), owner.Permissions);
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, owner.OwnerId.ToString()), new(ClaimTypes.Name, owner.Username), new(ClaimTypes.Role, owner.Role),
        };
        if (owner.StudioId is int studioId) claims.Add(new Claim(CurrentStudio.ClaimType, studioId.ToString()));
        claims.AddRange(permissions.Select(p => new Claim(AppPermissions.ClaimType, p)));
        var token = new JwtSecurityToken(
            _jwt.Issuer, _jwt.Audience,
            claims,
            expires: expires,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new LoginResponse(new JwtSecurityTokenHandler().WriteToken(token), expires, owner.FullName, owner.Role, permissions, owner.StudioId, studioName);
    }
}
