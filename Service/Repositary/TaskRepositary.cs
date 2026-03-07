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
        private readonly ILogger<TaskRepositary> _logger;

        public TaskRepositary(MongoDbContext context, IMapper mapper, ILogger<TaskRepositary> logger)
        {
            _context = context;
            _mapper = mapper;
            _taskCollection = _context.TaskCollection;
            _logger = logger;
        }

        public async Task<List<TaskItem>> GetAllTasksAsync(string userId)
        {
            try
            {
                var taskEntities = await _taskCollection
                    .Find(t => t.UserId == userId)
                    .ToListAsync();

                return _mapper.Map<List<TaskItem>>(taskEntities);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching all tasks for user {UserId}", userId);
                throw;
            }
        }

        public async Task<List<TaskItem>> GetTasksAsync(string userId, TaskFilterRequest filter)
        {
            var filterBuilder = Builders<SmartTaskManager.Models.Entities.TaskEntity>.Filter;
            var mongoFilter = filterBuilder.Eq(t => t.UserId, userId);

            if (!string.IsNullOrEmpty(filter.Title))
            {
                mongoFilter &= filterBuilder.Regex(t => t.Title, new MongoDB.Bson.BsonRegularExpression(filter.Title, "i"));
            }
            if (filter.Start.HasValue && filter.End.HasValue)
            {
                mongoFilter &= filterBuilder.Lte(t => t.Start, filter.End.Value);
                mongoFilter &= filterBuilder.Gte(t => t.End, filter.Start.Value);
            }
            else if (filter.Start.HasValue)
            {
                mongoFilter &= filterBuilder.Gte(t => t.End, filter.Start.Value);
            }
            else if (filter.End.HasValue)
            {
                mongoFilter &= filterBuilder.Lte(t => t.Start, filter.End.Value);
            }

            if(filter.Status != SmartTaskManager.Models.DTO.TaskStatus.All)
                mongoFilter &= filterBuilder.Eq(t => t.Status, (SmartTaskManager.Models.Entities.TaskStatus)filter.Status);

            if (!string.IsNullOrWhiteSpace(filter.Priority))
                mongoFilter &= filterBuilder.Regex(t => t.Priority, new MongoDB.Bson.BsonRegularExpression($"^{filter.Priority}$", "i"));

            try
            {
                var taskEntities = await _taskCollection
                .Find(mongoFilter)
                .ToListAsync();
                return _mapper.Map<List<TaskItem>>(taskEntities);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching filtered tasks for user {UserId}", userId);
                throw;
            }

        }
        public async Task<TaskItem?> GetTaskByIdAsync(string id)
        {
            try
            {
                var taskEntity = await _taskCollection
                                .Find(task => task.Id == id)
                                .FirstOrDefaultAsync();

                if (taskEntity == null)
                    return null;

                return _mapper.Map<TaskItem>(taskEntity);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching task {TaskId}", id);
                throw;
            }
        }

        public async Task<TaskItem> CreateTaskAsync(CreateTaskItem task, string userId){
            task.UserId = userId;
            task.Start = task.Start.HasValue ? DateTime.SpecifyKind(task.Start.Value, DateTimeKind.Utc) : null;
            task.End = task.End.HasValue ? DateTime.SpecifyKind(task.End.Value, DateTimeKind.Utc) : null;
            task.Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString();
            
            try{
                var taskEntity = _mapper.Map<TaskEntity>(task);
                taskEntity.CreatedTime = DateTime.UtcNow;
                taskEntity.LastUpdated = DateTime.UtcNow;
                //testEntity.Id = string.IsNullOrEmpty(task.Id) ? MongoDB.Bson.ObjectId.GenerateNewId().ToString() : task.Id;
                
                await _taskCollection.InsertOneAsync(taskEntity); 
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating task for user {UserId}", userId);
                throw;
            }
            
            return _mapper.Map<TaskItem>(task) ;
        }

        public async Task<TaskItem> UpdateTaskAsync(string id, string userId, TaskItem task){

            try
            {
                var existingTask = await _taskCollection.Find(t => t.Id == id && t.UserId == userId).FirstOrDefaultAsync();
                if (existingTask is null)
                {
                    throw new Exception("Task not found or you don't have permission");
                }

                existingTask.Title = task.Title ?? existingTask.Title;
                existingTask.Start = task.Start ?? existingTask.Start;
                existingTask.End = task.End ?? existingTask.End;
                existingTask.Priority = task.Priority ?? existingTask.Priority;
                existingTask.Comments = task.Comments ?? existingTask.Comments;
                existingTask.Status = (SmartTaskManager.Models.Entities.TaskStatus) task.Status;
                existingTask.LastUpdated = DateTime.UtcNow;

                await _taskCollection.ReplaceOneAsync(t => t.Id == id, existingTask);
                return _mapper.Map<TaskItem>(existingTask);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating task {TaskId} for user {UserId}", id, userId);
                throw;
            }
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