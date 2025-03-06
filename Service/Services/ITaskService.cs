using SmartTaskManager.Models;

namespace SmartTaskManager.Interfaces
{
    public interface ITaskService
    {
        Task<List<TaskItem>> GetAllTasksAsync();
        Task<TaskItem?> GetTaskByIdAsync(string id);
        Task CreateTaskAsync(TaskItem task);
        Task UpdateTaskAsync(string id, TaskItem task);
        Task DeleteTaskAsync(string id);
    }
}
