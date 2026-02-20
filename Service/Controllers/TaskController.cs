using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : BaseController
    {
        private readonly ITaskService _taskService;

        public TasksController(ITaskService taskService)
        {
            _taskService = taskService;
        }

        //[Authorize]
        [HttpGet]
        public async Task<ActionResult<List<TaskItem>>> GetAllTasks(){
            var tasks = await _taskService.GetAllTasksAsync(GetUserId());
            return Ok(tasks);
        }

        [HttpGet("test")]
        public async Task<ActionResult<List<TaskItem>>> GetTasks([FromQuery] TaskFilterRequest filter)
        {
            var userId = GetUserId();
            var tasks = await _taskService.GetTasksAsync(userId, filter);
            return Ok(tasks);
        }

        [HttpGet("month/{year}/{month}")]
        public async Task<ActionResult<List<TaskItem>>> GetTasksByMonth(int year, int month)
        {
            var tasks = await _taskService.GetTasksByMonthAsync(GetUserId(), year, month);
            return Ok(tasks);
        }

        //[Authorize]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskById(string id)
        {
            var task = await _taskService.GetTaskByIdAsync(id);
            return task == null ? NotFound() : Ok(task);
        }

        //[Authorize]
        [HttpPost]
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody]CreateTaskItem task)
        {
            var createdTask = await _taskService.CreateTaskAsync(GetUserId(), task);
            return CreatedAtAction(nameof(GetTaskById), new { id = createdTask.Id }, createdTask);
        }

        //[Authorize]
        [HttpPut("{id}")]
        public async Task<ActionResult<TaskItem>> UpdateTask(string id, [FromBody]TaskItem task)
        {
            var updatedTask = await _taskService.UpdateTaskAsync(id, GetUserId(), task);
            return Ok(updatedTask);
        }

        //[Authorize]
        [HttpPatch("{id}")]
        public async Task<ActionResult<TaskItem>> PatchTask(string id, [FromBody]TaskItem taskUpdate)
        {
            try
            {
                var patchedTask = await _taskService.PatchTaskAsync(id, GetUserId(), taskUpdate);
                return Ok(patchedTask);
            }
            catch (KeyNotFoundException)
            {
                return NotFound();
            }
        }

        //[Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(string id)
        {
            var result = await _taskService.DeleteTaskAsync(id, GetUserId());
            if (!result)
            {
                return NotFound();
            }
            return NoContent();
        }
    }
}
