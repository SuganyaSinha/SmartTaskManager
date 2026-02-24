using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Interfaces;
using Microsoft.AspNetCore.Authorization;


namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class UserRoutineController : BaseController
    {
        private readonly IUserRoutineService _userRoutineService;

        public UserRoutineController(IUserRoutineService userRoutineService)
        {
            _userRoutineService = userRoutineService;
        }

        [HttpGet]
        public async Task<ActionResult<RoutineProfile>> GetUserRoutine()
        {
            var routine = await _userRoutineService.GetUserRoutineAsync(UserId);
            return Ok(routine);
        }

        [HttpPost]
        public async Task<ActionResult<RoutineProfile>> CreateUserRoutine([FromBody]RoutineProfile routine)
        {
            var createdRoutine = await _userRoutineService.CreateUserRoutineAsync(UserId, routine);
            return CreatedAtAction(nameof(GetUserRoutine), new { id = createdRoutine.Id }, createdRoutine);
        }

        [HttpPut]
        public async Task<ActionResult<RoutineProfile>> UpdateUserRoutine([FromBody]RoutineProfile routine)
        {
            var updatedRoutine = await _userRoutineService.UpdateUserRoutineAsync(UserId, routine);
            return Ok(updatedRoutine);
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteUserRoutine()
        {
            await _userRoutineService.DeleteUserRoutineAsync(UserId);
            return NoContent();
        }
    }
}
