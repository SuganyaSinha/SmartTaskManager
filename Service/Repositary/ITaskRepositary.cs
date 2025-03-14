using SmartTaskManager.Models;

namespace SmartTaskManager.Repositary
{
    public interface ITaskRepository
    {
        Task<List<TaskItem>> GetAllTasksAsync(string userId);
        Task<List<TaskItem>> GetTasksByMonthAsync(string userId, int year, int month);
        Task<TaskItem?> GetTaskByIdAsync(string id);  
        Task<TaskItem> CreateTaskAsync(TaskItem task, string userId);
        Task<TaskItem> UpdateTaskAsync(string id, string userId, TaskItem task);
        Task<bool> DeleteTaskAsync(string id, string userId);
    }
    
}