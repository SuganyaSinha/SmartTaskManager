using SmartTaskManager.Models;

namespace SmartTaskManager.Interfaces
{
    public interface ITaskService
    {
        Task<List<TaskItem>> GetAllTasksAsync(string UserId);
        Task<List<TaskItem>> GetTasksByMonthAsync(string userId, int year, int month);
        Task<TaskItem?> GetTaskByIdAsync(string id);
        Task<TaskItem> CreateTaskAsync(string userId, TaskItem task);        Task<TaskItem> UpdateTaskAsync(string id, string userId, TaskItem task);
        Task<TaskItem> PatchTaskAsync(string id, string userId, TaskUpdateDto taskUpdate);
        Task<bool> DeleteTaskAsync(string id, string userId);
    }
}
