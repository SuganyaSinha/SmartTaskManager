using AutoMapper;
using MongoDB.Driver;
using SmartTaskManager.Data;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Models.Entities;

namespace SmartTaskManager.Repositary
{

    public class TaskRepositary : ITaskRepository
    {
        private readonly MongoDbContext _context;
        private readonly IMapper _mapper;
        private readonly IMongoCollection<SmartTaskManager.Models.Entities.TaskEntity> _taskCollection;

        public TaskRepositary(MongoDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
            _taskCollection = _context.TaskCollection;
        }

        public async Task<List<TaskItem>> GetAllTasksAsync(string userId)
        {
            var taskEntities = await _taskCollection
                .Find(t => t.UserId == userId)
                .ToListAsync();

            return _mapper.Map<List<TaskItem>>(taskEntities);
        }

        public async Task<List<TaskItem>> GetTasksByMonthAsync(string userId, int year, int month)
        {
            var taskEntities = await _taskCollection
                .Find(t => t.UserId == userId &&
                           t.Start.HasValue &&
                           t.Start.Value.Year == year &&
                           t.Start.Value.Month == month)
                .ToListAsync();

            return _mapper.Map<List<TaskItem>>(taskEntities);
        }

        public async Task<TaskItem?> GetTaskByIdAsync(string id)
        {
            var taskEntity = await _taskCollection
                            .Find(task => task.Id == id)
                            .FirstOrDefaultAsync();
            
            if (taskEntity == null)
                return null;
                
            return _mapper.Map<TaskItem>(taskEntity);
        }

        public async Task<TaskItem> CreateTaskAsync(CreateTaskItem task, string userId){
            task.UserId = userId;
            task.Start = task.Start.HasValue ? DateTime.SpecifyKind(task.Start.Value, DateTimeKind.Utc) : null;
            task.End = task.End.HasValue ? DateTime.SpecifyKind(task.End.Value, DateTimeKind.Utc) : null;
            task.Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString();
            
            try{
                var testEntity = _mapper.Map<TaskEntity>(task);
                //testEntity.Id = string.IsNullOrEmpty(task.Id) ? MongoDB.Bson.ObjectId.GenerateNewId().ToString() : task.Id;
                
                await _taskCollection.InsertOneAsync(testEntity); 
            }
            catch(Exception ex)
            {
                var msg = ex.Message;           
            }
            
            return _mapper.Map<TaskItem>(task) ;
        }
            

        public async Task<TaskItem> UpdateTaskAsync(string id, string userId, TaskItem task){

            var existingTask = await _taskCollection.Find(t => t.Id == id && t.UserId == userId).FirstOrDefaultAsync();
            if (existingTask == null)
            {
                throw new Exception("Task not found or you don't have permission");
            }

            existingTask.Title = task.Title ?? existingTask.Title;
            existingTask.Start = task.Start ?? existingTask.Start;
            existingTask.End = task.End ?? existingTask.End;
            existingTask.Priority = task.Priority ?? existingTask.Priority;
            existingTask.Comments = task.Comments ?? existingTask.Comments;
            existingTask.Status = (SmartTaskManager.Models.Entities.TaskStatus) task.Status;

            await _taskCollection.ReplaceOneAsync(t => t.Id == id, existingTask);
            return _mapper.Map<TaskItem>(existingTask);
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