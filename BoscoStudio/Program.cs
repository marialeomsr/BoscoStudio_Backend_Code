using System.Text;
using BoscoStudio.Api.Middleware;
using BoscoStudio.Application.Services;
using BoscoStudio.Application.Validators;
using BoscoStudio.Infrastructure.Data;
using BoscoStudio.Infrastructure.Security;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ---------- Database (scaffolded context, registered here instead of OnConfiguring) ----------
builder.Services.AddDbContext<PhotoStudioDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("PhotoStudioDb")));

// ---------- Application services ----------
builder.Services.AddScoped<DocumentNumberGenerator>();
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IAlbumService, AlbumService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IDocumentService, DocumentService>();
builder.Services.AddScoped<ILookupService, LookupService>();
builder.Services.AddScoped<ICatalogService, CatalogService>();
builder.Services.AddScoped<IClientService, ClientService>();
builder.Services.AddScoped<IOwnerService, OwnerService>();
builder.Services.AddScoped<IStudioSettingsService, StudioSettingsService>();
builder.Services.AddScoped<IAuthService, AuthService>();

// ---------- Auth: single-owner JWT, everything locked unless [AllowAnonymous] ----------
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        // A token only counts while its owner account still exists (deleting an owner ends their session at once).
        o.Events = new JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var db = ctx.HttpContext.RequestServices.GetRequiredService<PhotoStudioDbContext>();
                var idClaim = ctx.Principal?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var roleClaim = ctx.Principal?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
                if (!int.TryParse(idClaim, out int ownerId))
                {
                    ctx.Fail("Invalid token.");
                    return;
                }
                // The account must still exist AND still have the role the token was issued with
                // (a removed or re-roled owner is signed out and logs in again with the current role).
                var current = await db.OwnerAccounts.Where(a => a.OwnerId == ownerId).Select(a => new { a.Role, a.Permissions }).FirstOrDefaultAsync();
                string tokenPermissions = string.Join(',', ctx.Principal!.FindAll(BoscoStudio.Application.Common.AppPermissions.ClaimType).Select(c => c.Value).Order());
                if (current is null || current.Role != roleClaim
                    || string.Join(',', BoscoStudio.Application.Common.AppPermissions.Effective(current.Role, current.Permissions)) != tokenPermissions)
                    ctx.Fail("Owner account changed or removed.");
            }
        };
    });
var authorization = builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());
foreach (string permission in BoscoStudio.Application.Common.AppPermissions.All)
    authorization.AddPolicy(BoscoStudio.Application.Common.AppPermissions.Policy(permission),
        p => p.RequireClaim(BoscoStudio.Application.Common.AppPermissions.ClaimType, permission));

// ---------- MVC, validation, Swagger ----------
builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<CreateOrderRequestValidator>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Bosco Studio API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT", In = ParameterLocation.Header,
        Description = "Paste the token returned by POST /api/auth/login"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }] = []
    });
});

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .SetIsOriginAllowed(origin =>
        allowedOrigins.Contains(origin) ||
        // Dev convenience: Visual Studio / ng serve pick random localhost ports.
        (builder.Environment.IsDevelopment() && new Uri(origin).IsLoopback))
    .AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
