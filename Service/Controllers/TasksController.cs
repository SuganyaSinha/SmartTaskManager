using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class TasksController : BaseController
    {
        private readonly ITaskService _taskService;

        public TasksController(ITaskService taskService)
        {
            _taskService = taskService;
        }

        [HttpGet]
        public async Task<ActionResult<List<TaskItem>>> GetTasks([FromQuery] TaskFilterRequest filter)
        {
            var tasks = await _taskService.GetTasksAsync(UserId, filter);
            return Ok(tasks);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskById(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest("Task ID is required.");

            var task = await _taskService.GetTaskByIdAsync(id, UserId);
            if (task == null)
                return NotFound();

            return Ok(task);
        }

        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody]CreateTaskItem task)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (task.Start.HasValue && task.End.HasValue && task.End <= task.Start)
                return BadRequest("End date/time must be after Start date/time.");

            var createdTask = await _taskService.CreateTaskAsync(UserId, task);
            return CreatedAtAction(nameof(GetTaskById), new { id = createdTask.Id }, createdTask);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TaskItem>> UpdateTask(string id, [FromBody]TaskItem task)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest("Task ID is required.");

            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!string.IsNullOrWhiteSpace(task.Id) && task.Id != id)
                return BadRequest("Task ID in the body does not match the route ID.");

            if (task.Start.HasValue && task.End.HasValue && task.End <= task.Start)
                return BadRequest("End date/time must be after Start date/time.");

            try
            {
                var updatedTask = await _taskService.UpdateTaskAsync(id, UserId, task);
                return Ok(updatedTask);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpPatch("{id}")]
        public async Task<ActionResult<TaskItem>> PatchTask(string id, [FromBody]TaskItem taskUpdate)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest("Task ID is required.");

            if (taskUpdate.Start.HasValue && taskUpdate.End.HasValue && taskUpdate.End <= taskUpdate.Start)
                return BadRequest("End date/time must be after Start date/time.");

            try
            {
                var patchedTask = await _taskService.PatchTaskAsync(id, UserId, taskUpdate);
                return Ok(patchedTask);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest("Task ID is required.");

            var result = await _taskService.DeleteTaskAsync(id, UserId);
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
        }
    }
}
