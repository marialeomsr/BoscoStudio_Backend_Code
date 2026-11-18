using BoscoStudio.Application.Common;
using BoscoStudio.Application.Dtos;
using BoscoStudio.Domain.Entities;
using BoscoStudio.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace BoscoStudio.Application.Services;

public interface IClientService
{
    Task<List<ClientListDto>> GetListAsync(string? search, CancellationToken ct);
    Task<ClientListDto> CreateAsync(SaveClientRequest request, CancellationToken ct);
    Task<ClientListDto> UpdateAsync(int clientId, SaveClientRequest request, CancellationToken ct);
    Task DeleteAsync(int clientId, CancellationToken ct);
}

public class ClientService(PhotoStudioDbContext db) : IClientService
{
    public Task<List<ClientListDto>> GetListAsync(string? search, CancellationToken ct) =>
        db.Clients.AsNoTracking()
            .Where(c => string.IsNullOrEmpty(search) || c.FullName.Contains(search) || c.Phone.Contains(search)
                     || (c.Email != null && c.Email.Contains(search)))
            .OrderBy(c => c.FullName)
            .Take(500)
            .Select(c => new ClientListDto(c.ClientId, c.FullName, c.Phone, c.WhatsAppNo, c.Email, c.Address, c.Notes, c.Orders.Count))
            .ToListAsync(ct);

    public async Task<ClientListDto> CreateAsync(SaveClientRequest r, CancellationToken ct)
    {
        await EnsureNotDuplicateAsync(r, 0, ct);
        var client = new Client();
        Apply(client, r);
        db.Clients.Add(client);
        await db.SaveChangesAsync(ct);
        return ToDto(client, 0);
    }

    public async Task<ClientListDto> UpdateAsync(int clientId, SaveClientRequest r, CancellationToken ct)
    {
        var client = await db.Clients.FindAsync([clientId], ct) ?? throw new NotFoundException("Client", clientId);
        await EnsureNotDuplicateAsync(r, clientId, ct);
        Apply(client, r);   // orders reference the client by id, so they show the new details immediately
        await db.SaveChangesAsync(ct);
        return ToDto(client, await db.Orders.CountAsync(o => o.ClientId == clientId, ct));
    }

    public async Task DeleteAsync(int clientId, CancellationToken ct)
    {
        var client = await db.Clients.FindAsync([clientId], ct) ?? throw new NotFoundException("Client", clientId);
        if (await db.Orders.AnyAsync(o => o.ClientId == clientId, ct))
            throw new BusinessRuleException("This client has orders and cannot be deleted. Edit the details instead.");
        db.Clients.Remove(client);
        await db.SaveChangesAsync(ct);
    }

    private async Task EnsureNotDuplicateAsync(SaveClientRequest r, int ignoreId, CancellationToken ct)
    {
        string name = r.FullName.Trim(), phone = r.Phone.Trim();
        if (await db.Clients.AnyAsync(c => c.ClientId != ignoreId && c.FullName == name && c.Phone == phone, ct))
            throw new ConflictException($"{name} ({phone}) already exists.");
    }

    private static void Apply(Client c, SaveClientRequest r)
    {
        c.FullName = r.FullName.Trim();
        c.Phone = r.Phone.Trim();
        c.WhatsAppNo = Clean(r.WhatsAppNo);
        c.Email = Clean(r.Email);
        c.Address = Clean(r.Address);
        c.Notes = Clean(r.Notes);
    }

    private static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

    private static ClientListDto ToDto(Client c, int orderCount) =>
        new(c.ClientId, c.FullName, c.Phone, c.WhatsAppNo, c.Email, c.Address, c.Notes, orderCount);
}
