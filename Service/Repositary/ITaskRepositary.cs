using SmartTaskManager.Models;

namespace SmartTaskManager.Repositary
{
    public interface ITaskRepository
    {
        Task<List<TaskItem>> GetAllTasksAsync();
        Task<TaskItem?> GetTaskByIdAsync(string id);  
        Task CreateTaskAsync(TaskItem task);
        Task UpdateTaskAsync(string id, TaskItem task);
        Task DeleteTaskAsync(string id);
    }
    
}