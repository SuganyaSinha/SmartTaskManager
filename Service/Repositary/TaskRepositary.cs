using MongoDB.Driver;
using SmartTaskManager.Data;
using SmartTaskManager.Models;

namespace SmartTaskManager.Repositary
{

    public class TaskRepositary : ITaskRepository
    {
        private readonly MongoDbContext _context;
        private readonly IMongoCollection<TaskItem> _taskCollection;

        public TaskRepositary(MongoDbContext context)
        {
            _context = context;
            _taskCollection = _context.TaskCollection;
        }

        public async Task<List<TaskItem>> GetAllTasksAsync(string userId) =>
            await _taskCollection
            .Find(t => t.UserId == userId)
            .ToListAsync();

        public async Task<List<TaskItem>> GetTasksByMonthAsync(string userId, int year, int month)
        {
            var result = await _taskCollection
            .Find(t => t.UserId == userId &&
                       t.Start.Year == year &&
                       t.Start.Month == month)
            .ToListAsync();

            return result;
        }

        public async Task<TaskItem?> GetTaskByIdAsync(string id) =>
            await _taskCollection.Find(task => task.Id == id).FirstOrDefaultAsync();

        public async Task<TaskItem> CreateTaskAsync(TaskItem task, string userId){
            task.UserId = userId;
            task.Start = DateTime.SpecifyKind(task.Start, DateTimeKind.Utc);
            task.End = DateTime.SpecifyKind(task.End, DateTimeKind.Utc);
            await _taskCollection.InsertOneAsync(task); 
            return task;
        }
            

        public async Task<TaskItem> UpdateTaskAsync(string id, string userId, TaskItem task){

            var existingTask = await _taskCollection.Find(task => task.Id == id && task.UserId == userId).FirstOrDefaultAsync();
            if (existingTask == null)
            {
                throw new Exception("Task not found or you don't have permission");
            }

            existingTask.Title = task.Title;
            existingTask.Start = task.Start;
            existingTask.End = task.End;
            existingTask.Priority = task.Priority;
            existingTask.Comments = task.Comments;

            await _taskCollection.ReplaceOneAsync(t => t.Id == id, existingTask);
            return existingTask;
        }
            

        public async Task<bool> DeleteTaskAsync(string id, string userId){

            var existingTask = await _taskCollection.Find(task => task.Id == id && task.UserId == userId).FirstOrDefaultAsync();
            if (existingTask == null)
            {
                return false;
            }

            await _taskCollection.DeleteOneAsync(task => task.Id == id);
            return true;
        }
            
    }

}