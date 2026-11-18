using Microsoft.AspNetCore.Authorization;

namespace BoscoStudio.Application.Common;

/// <summary>
/// What an owner may do. Each owner has their own set; the role (Manager / Staff) is just the starting preset
/// that a new owner gets, and that an Admin can then adjust per person. Admins always have everything.
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

    private static readonly string[] StaffPreset = [OrdersEdit, PaymentsRecord, AlbumsEdit, ClientsEdit];

    private static readonly string[] ManagerPreset =
        [OrdersEdit, OrdersDelete, PaymentsRecord, PaymentsDelete, AlbumsEdit, AlbumsDelete, ClientsEdit, ClientsDelete, DocumentsManage];

    public static string Policy(string permission) => $"perm:{permission}";

    /// <summary>The starting set for a role (Admin = everything).</summary>
    public static string[] ForRole(string role) => role switch
    {
        Roles.Admin => All,
        Roles.Manager => ManagerPreset,
        _ => StaffPreset,
    };

    /// <summary>What the owner can actually do: everything for an Admin, else their saved set, else the role's preset. Sorted.</summary>
    public static string[] Effective(string role, string? stored)
    {
        if (role == Roles.Admin) return All.Order().ToArray();
        if (stored is null) return ForRole(role).Order().ToArray();
        return stored.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(All.Contains).Distinct().Order().ToArray();
    }

    /// <summary>Column value for a chosen set (null = "use the role's preset").</summary>
    public static string? Serialize(IEnumerable<string>? permissions) =>
        permissions is null ? null : string.Join(',', permissions.Where(All.Contains).Distinct().Order());
}

/// <summary>[RequirePermission(AppPermissions.OrdersDelete)]: the signed-in owner must have that permission.</summary>
public class RequirePermissionAttribute(string permission) : AuthorizeAttribute(AppPermissions.Policy(permission));
