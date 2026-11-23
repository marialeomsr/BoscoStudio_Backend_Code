namespace BoscoStudio.Domain.Entities;

/// <summary>Implemented by every row that belongs to one studio. The DbContext filters reads by it and stamps it on insert.</summary>
public interface IStudioScoped
{
    int StudioId { get; set; }
}
