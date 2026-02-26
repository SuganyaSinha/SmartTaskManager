using SmartTaskManager.Models.DTO;

namespace SmartTaskManager.Interfaces
{
    public interface ITaskService
    {
        Task<List<TaskItem>> GetTasksAsync(string UserId, TaskFilterRequest filter);
        Task<TaskItem?> GetTaskByIdAsync(string id);
        Task<TaskItem> CreateTaskAsync(string userId, CreateTaskItem task); 
        Task<TaskItem> UpdateTaskAsync(string id, string userId, TaskItem task);
        Task<TaskItem> PatchTaskAsync(string id, string userId, TaskItem taskUpdate);
        Task<bool> DeleteTaskAsync(string id, string userId);
    }
}
