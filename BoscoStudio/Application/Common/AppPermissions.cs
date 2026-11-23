using Microsoft.AspNetCore.Authorization;

namespace BoscoStudio.Application.Common;

/// <summary>
/// What a login may do. Each login has their own set; the role (Roles master table) is the default set a new login gets,
/// which the SuperAdmin can then adjust per person. The SuperAdmin always has everything.
/// Viewing (orders, calendar, albums, clients, payments, dashboard) is open to every signed-in owner.
/// </summary>
public static class AppPermissions
{
    public const string ClaimType = "perm";

    public const string OrdersEdit = "orders.edit";
    public const string OrdersDelete = "orders.delete";
    public const string PaymentsRecord = "payments.record";
    public const string PaymentsDelete = "payments.delete";
    public const string AlbumsEdit = "albums.edit";
    public const string AlbumsDelete = "albums.delete";
    public const string ClientsEdit = "clients.edit";
    public const string ClientsDelete = "clients.delete";
    public const string DocumentsManage = "documents.manage";
    public const string SettingsManage = "settings.manage";
    public const string OwnersManage = "owners.manage";

    public static readonly string[] All =
    [
        OrdersEdit, OrdersDelete, PaymentsRecord, PaymentsDelete, AlbumsEdit, AlbumsDelete,
        ClientsEdit, ClientsDelete, DocumentsManage, SettingsManage, OwnersManage,
    ];

    public static string Policy(string permission) => $"perm:{permission}";

    /// <summary>Splits a stored comma-separated set into known, distinct, sorted permissions.</summary>
    public static string[] Parse(string? stored) =>
        (stored ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(All.Contains).Distinct().Order().ToArray();

    /// <summary>
    /// What the owner can actually do: everything for the SuperAdmin, else their own saved set, else the role's default set
    /// (<paramref name="roleDefaults"/>, from the Roles master table). Sorted.
    /// </summary>
    public static string[] Effective(string role, string? roleDefaults, string? stored) =>
        role == Roles.SuperAdmin ? All.Order().ToArray() : Parse(stored ?? roleDefaults);

    /// <summary>Column value for a chosen set (null = "use the role's default").</summary>
    public static string? Serialize(IEnumerable<string>? permissions) =>
        permissions is null ? null : string.Join(',', permissions.Where(All.Contains).Distinct().Order());
}
/// <summary>[RequirePermission(AppPermissions.OrdersDelete)]: the signed-in owner must have that permission.</summary>
public class RequirePermissionAttribute(string permission) : AuthorizeAttribute(AppPermissions.Policy(permission));

