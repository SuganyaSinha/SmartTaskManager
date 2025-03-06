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

        public async Task<List<TaskItem>> GetAllTasksAsync() =>
            await _taskCollection.Find(_ => true).ToListAsync();

        public async Task<TaskItem?> GetTaskByIdAsync(string id) =>
            await _taskCollection.Find(task => task.Id == id).FirstOrDefaultAsync();

        public async Task CreateTaskAsync(TaskItem task) =>
            await _taskCollection.InsertOneAsync(task);

        public async Task UpdateTaskAsync(string id, TaskItem task) =>
            await _taskCollection.ReplaceOneAsync(t => t.Id == id, task);

        public async Task DeleteTaskAsync(string id) =>
            await _taskCollection.DeleteOneAsync(task => task.Id == id);
    }

}