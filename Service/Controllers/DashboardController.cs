using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Services;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DashboardController : BaseController
    {
        private readonly DashboardSnapshotService _snapshotService;

        public DashboardController(DashboardSnapshotService snapshotService)
        {
            _snapshotService = snapshotService;
        }

        [HttpGet("snapshot")]
        public async Task<ActionResult<DashboardSnapshot>> GetSnapshot([FromQuery] string? timeZone)
        {
            var snapshot = await _snapshotService.GenerateSnapshotAsync(UserId, timeZone);
            return Ok(snapshot);
        }
    }
}
