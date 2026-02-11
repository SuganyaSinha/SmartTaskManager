using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Interfaces;


namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserRoutineController : ControllerBase
    {
        private readonly IUserRoutineService _userRoutineService;

        private string GetUserId()
        {
            var userId = User.FindFirst("sub")?.Value;
            if(string.IsNullOrEmpty(userId))
                throw new Exception("Could not get the User Id from the token");
            else
                return userId;
        }

        public UserRoutineController(IUserRoutineService userRoutineService)
        {
            _userRoutineService = userRoutineService;
        }

        //[Authorize]
        [HttpGet]
        public async Task<ActionResult<RoutineProfile>> GetUserRoutine()
        {
            var routine = await _userRoutineService.GetUserRoutineAsync(GetUserId());
            return Ok(routine);
        }

        //[Authorize]
        [HttpPost]
        public async Task<ActionResult<RoutineProfile>> CreateUserRoutine([FromBody]RoutineProfile routine)
        {
            var createdRoutine = await _userRoutineService.CreateUserRoutineAsync(GetUserId(), routine);
            return CreatedAtAction(nameof(GetUserRoutine), new { id = createdRoutine.Id }, createdRoutine);
        }

        //[Authorize]
        [HttpPut]
        public async Task<ActionResult<RoutineProfile>> UpdateUserRoutine([FromBody]RoutineProfile routine)
        {
            var updatedRoutine = await _userRoutineService.UpdateUserRoutineAsync(GetUserId(), routine);
            return Ok(updatedRoutine);
        }

        //[Authorize]
        [HttpDelete]
        public async Task<IActionResult> DeleteUserRoutine()
        {
            await _userRoutineService.DeleteUserRoutineAsync(GetUserId());
            return NoContent();
        }
    }
}
