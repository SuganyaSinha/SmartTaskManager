using SmartTaskManager.Models.DTO;

namespace SmartTaskManager.Services
{
    public interface IAnalyticsService
    {
        Task<ProductivityStatsDto> GetProductivityStatsAsync(string userId, string period, DateTime referenceDate, string? timeZone);
    }
}
