using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;

namespace SmartTaskManager.Services
{
    public class TaskService
    {
        private readonly ITaskRepository _taskRepositary;

        public TaskService(ITaskRepository taskRepositary)
        {
            _taskRepositary = taskRepositary;
        }

        public async Task<List<TaskItem>> GetTasksAsync(string userId, TaskFilterRequest filter)
        {
            if (filter == null || filter.IsEmpty)
            {
                return await _taskRepositary.GetAllTasksAsync(userId);
            }
            else
            {
                return await _taskRepositary.GetTasksAsync(userId, filter);
            }
        }

        public async Task<TaskItem?> GetTaskByIdAsync(string id, string userId)
        {
            var task = await _taskRepositary.GetTaskByIdAsync(id);
            if (task == null || task.UserId != userId)
            {
                return null;
            }
            return task;
        }

        public async Task<TaskItem> CreateTaskAsync(string userId, CreateTaskItem task)
        {
            if (!string.IsNullOrEmpty(task.TimeZone))
            {
                try
                {
                    TimeZoneInfo clientTimeZone = TimeZoneInfo.FindSystemTimeZoneById(task.TimeZone);
                    task.Start = task.Start.HasValue ? ConvertToUtc(task.Start.Value, clientTimeZone) : null;
                    task.End = task.End.HasValue ? ConvertToUtc(task.End.Value, clientTimeZone) : null;
                }
                catch (TimeZoneNotFoundException)
                {
                    throw new ArgumentException($"Invalid timezone: {task.TimeZone}");
                }
            }

            return await _taskRepositary.CreateTaskAsync(task, userId);
        }

        public async Task<TaskItem> UpdateTaskAsync(string id, string userId, TaskItem task)
        {
            var existingTask = await _taskRepositary.GetTaskByIdAsync(id);
            if (existingTask == null || existingTask.UserId != userId)
            {
                throw new KeyNotFoundException("Task not found or unauthorized");
            }

            if (task.Status == Models.DTO.TaskStatus.Completed && existingTask.Status != Models.DTO.TaskStatus.Completed)
            {
                task.CompletedAt = DateTime.UtcNow;
            }

            return await _taskRepositary.UpdateTaskAsync(id, userId, task);
        }

        public async Task<bool> DeleteTaskAsync(string id, string userId)
        {
            return await _taskRepositary.DeleteTaskAsync(id, userId);
        }

        public async Task<TaskItem> PatchTaskAsync(string id, string userId, TaskItem taskUpdate)
        {
            var existingTask = await _taskRepositary.GetTaskByIdAsync(id);
            if (existingTask == null || existingTask.UserId != userId)
            {
                throw new KeyNotFoundException("Task not found or unauthorized");
            }

            if (taskUpdate.Status == Models.DTO.TaskStatus.Completed && existingTask.Status != Models.DTO.TaskStatus.Completed)
            {
                taskUpdate.CompletedAt = DateTime.UtcNow;
            }

            return await _taskRepositary.UpdateTaskAsync(id, userId, taskUpdate);
        }

        private DateTime ConvertToUtc(DateTime dateTime, TimeZoneInfo timeZone)
        {
            if (timeZone == null)
            {
                return DateTime.SpecifyKind(dateTime, DateTimeKind.Utc);
            }

            DateTime localDateTime = DateTime.SpecifyKind(dateTime, DateTimeKind.Unspecified);
            return TimeZoneInfo.ConvertTimeToUtc(localDateTime, timeZone);
        }
    }
}
