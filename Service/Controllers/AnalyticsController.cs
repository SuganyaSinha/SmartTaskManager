using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Services;

namespace SmartTaskManager.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AnalyticsController : BaseController
    {
        private readonly IAnalyticsService _analyticsService;

        public AnalyticsController(IAnalyticsService analyticsService)
        {
            _analyticsService = analyticsService;
        }

        /// <summary>
        /// GET /api/analytics/productivity?period=week&amp;date=2026-03-09&amp;timeZone=America/New_York
        /// period: day | week | month
        /// </summary>
        [HttpGet("productivity")]
        public async Task<IActionResult> GetProductivity(
            [FromQuery] string period = "week",
            [FromQuery] DateTime? date = null,
            [FromQuery] string? timeZone = null)
        {
            if (period != "day" && period != "week" && period != "month")
                return BadRequest("period must be 'day', 'week', or 'month'");

            var referenceDate = date ?? DateTime.UtcNow;

            var stats = await _analyticsService.GetProductivityStatsAsync(UserId, period, referenceDate, timeZone);
            return Ok(stats);
        }
    }
}
