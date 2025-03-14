using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models;
using SmartTaskManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace TaskManagerApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TasksController : ControllerBase
    {
        private readonly ITaskService _taskService;

        private string GetUserId()
        {
            var userId = User.FindFirst("sub")?.Value;
            if(string.IsNullOrEmpty(userId))
                throw new Exception("Could not get the User Id from the token");
            else
                return userId;
        }

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
        public async Task<ActionResult<TaskItem>> CreateTask([FromBody]TaskItem task)
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
