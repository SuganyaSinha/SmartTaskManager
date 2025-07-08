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

        public async Task<List<TaskItem>> GetAllTasksAsync(string userId)
        {
            return await _taskRepositary.GetAllTasksAsync(userId);
        }

        public async Task<List<TaskItem>> GetTasksByMonthAsync(string userId, int year, int month)
        {
            return await _taskRepositary.GetTasksByMonthAsync(userId, year, month);
        }
        
        public async Task<TaskItem?> GetTaskByIdAsync(string id) 
        {
            return await _taskRepositary.GetTaskByIdAsync(id);
        }

        public async Task<TaskItem> CreateTaskAsync(string userId, TaskItem task) 
        {
            return await _taskRepositary.CreateTaskAsync(task, userId);
        }

        public async Task<TaskItem> UpdateTaskAsync(string id, string userId, TaskItem task)
        {
            return await _taskRepositary.UpdateTaskAsync(id, userId, task);      
        }

        public async Task<bool> DeleteTaskAsync(string id, string userId) 
        {
            return await _taskRepositary.DeleteTaskAsync(id, userId);
        }

        public async Task<TaskItem> PatchTaskAsync(string id, string userId, TaskUpdateDto taskUpdate)
        {
            var existingTask = await _taskRepositary.GetTaskByIdAsync(id);
            if (existingTask == null || existingTask.UserId != userId)
            {
                throw new KeyNotFoundException("Task not found or unauthorized");
            }

            if (taskUpdate.Title != null) existingTask.Title = taskUpdate.Title;
            if (taskUpdate.Start.HasValue) existingTask.Start = taskUpdate.Start.Value;
            if (taskUpdate.End.HasValue) existingTask.End = taskUpdate.End.Value;
            if (taskUpdate.Priority != null) existingTask.Priority = taskUpdate.Priority;
            if (taskUpdate.Comments != null) existingTask.Comments = taskUpdate.Comments;

            return await _taskRepositary.UpdateTaskAsync(id, userId, existingTask);
        }
    }
}
