using BoscoStudio.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;

namespace BoscoStudio.Application.Services;

/// <summary>
/// Gap-free, race-safe numbers (per studio) like ORD-2026-001 / INV-2026-001 / QTN-2026-001.
/// The counter lives in DocumentSequences and is bumped by stored procedure usp_GetNextDocumentNumber.
/// </summary>
public class DocumentNumberGenerator(PhotoStudioDbContext db, BoscoStudio.Application.Common.ICurrentStudio studio)
{
    public async Task<string> NextAsync(string prefix, CancellationToken ct = default)
    {
        int studioId = studio.StudioId ?? throw new BoscoStudio.Application.Common.BusinessRuleException("Choose a studio first.");
        int year = DateTime.Today.Year;
        var next = new SqlParameter("@NextNumber", SqlDbType.Int) { Direction = ParameterDirection.Output };

        await db.Database.ExecuteSqlRawAsync(
            "EXEC dbo.usp_GetNextDocumentNumber @StudioId, @Prefix, @Year, @NextNumber OUTPUT",
            [new SqlParameter("@StudioId", studioId), new SqlParameter("@Prefix", prefix), new SqlParameter("@Year", year), next], ct);

        return $"{prefix}-{year}-{(int)next.Value:000}";
    }
}
