using SmartTaskManager.Models.DTO;

namespace SmartTaskManager.Repositary
{
    public interface ITaskRepository
    {
        Task<List<TaskItem>> GetAllTasksAsync(string userId);
        Task<List<TaskItem>> GetTasksAsync(string userId, TaskFilterRequest filter);
        Task<TaskItem?> GetTaskByIdAsync(string id);  
        Task<TaskItem> CreateTaskAsync(CreateTaskItem task, string userId);
        Task<TaskItem> UpdateTaskAsync(string id, string userId, TaskItem task);
        Task<bool> DeleteTaskAsync(string id, string userId);
        Task<int> BulkRescheduleAsync(string userId, DateTime sourceStart, DateTime sourceEnd, DateTime targetStart, string status);
        Task<int> BulkUpdateStatusAsync(string userId, DateTime? startDate, DateTime? endDate, string currentStatus, string newStatus);
        Task<int> BulkDeleteAsync(string userId, DateTime? startDate, DateTime? endDate, string status);
        Task<Dictionary<string, int>> GetTaskCountsByStatusAsync(string userId, DateTime? startDate, DateTime? endDate);
    }
    
}