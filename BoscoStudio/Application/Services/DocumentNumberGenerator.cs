using BoscoStudio.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace BoscoStudio.Application.Services;

/// <summary>
/// Gap-free, race-safe numbers like ORD-2026-001 / INV-2026-001 / QTN-2026-001.
/// The counter lives in DocumentSequences and is bumped by stored procedure usp_GetNextDocumentNumber.
/// </summary>
public class DocumentNumberGenerator(PhotoStudioDbContext db)
{
    public async Task<string> NextAsync(string prefix, CancellationToken ct = default)
    {
        int year = DateTime.Today.Year;
        var next = new SqlParameter("@NextNumber", SqlDbType.Int) { Direction = ParameterDirection.Output };

        await db.Database.ExecuteSqlRawAsync(
            "EXEC dbo.usp_GetNextDocumentNumber @Prefix, @Year, @NextNumber OUTPUT",
            [new SqlParameter("@Prefix", prefix), new SqlParameter("@Year", year), next], ct);

        return $"{prefix}-{year}-{(int)next.Value:000}";
    }
}
