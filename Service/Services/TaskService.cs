using MongoDB.Driver;
using SmartTaskManager.Models;
using TaskManagerApi.Data;
using Microsoft.Extensions.Options;
using SmartTaskManager.Interfaces;
using SmartTaskManager.Repositary;

namespace SmartTaskManager.Services
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _taskRepositary;

        public TaskService(ITaskRepository taskRepositary)
        {
            _taskRepositary = taskRepositary;
         }

        public async Task<List<TaskItem>> GetAllTasksAsync()
        {
            return await _taskRepositary.GetAllTasksAsync();
        }
        
        public async Task<TaskItem?> GetTaskByIdAsync(string id) 
        {
            return await _taskRepositary.GetTaskByIdAsync(id);
        }

        public async Task CreateTaskAsync(TaskItem task) 
        {
            await _taskRepositary.CreateTaskAsync(task);
        }

        public async Task UpdateTaskAsync(string id, TaskItem task)
        {
            await _taskRepositary.UpdateTaskAsync(id,task);      
        }

        public async Task DeleteTaskAsync(string id) 
        {
            await _taskRepositary.DeleteTaskAsync(id);
        }
    }
}
