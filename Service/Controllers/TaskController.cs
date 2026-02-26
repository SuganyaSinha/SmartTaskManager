using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

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
            var userId = UserId;
            var tasks = await _taskService.GetTasksAsync(UserId, filter);
            return Ok(tasks);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskById(string id)
        {
            var task = await _taskService.GetTaskByIdAsync(id);
            return task == null ? NotFound() : Ok(task);
        }

        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody]CreateTaskItem task)
        {
            var createdTask = await _taskService.CreateTaskAsync(UserId, task);
            return CreatedAtAction(nameof(GetTaskById), new { id = createdTask.Id }, createdTask);
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TaskItem>> UpdateTask(string id, [FromBody]TaskItem task)
        {
            var updatedTask = await _taskService.UpdateTaskAsync(id, UserId, task);
            return Ok(updatedTask);
        }

        [HttpPatch("{id}")]
        public async Task<ActionResult<TaskItem>> PatchTask(string id, [FromBody]TaskItem taskUpdate)
        {
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
            var result = await _taskService.DeleteTaskAsync(id, UserId);
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
        }
    }
}
