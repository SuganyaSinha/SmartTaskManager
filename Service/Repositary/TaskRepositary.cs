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
                if (task.CompletedAt.HasValue)
                    existingTask.CompletedAt = task.CompletedAt;
                if (task.Category != null)
                    existingTask.Category = task.Category;

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

        public async Task<int> BulkRescheduleAsync(string userId, DateTime sourceStart, DateTime sourceEnd, DateTime targetStart, string status)
        {
            var filterBuilder = Builders<SmartTaskManager.Models.Entities.TaskEntity>.Filter;
            var mongoFilter = filterBuilder.Eq(t => t.UserId, userId)
                & filterBuilder.Gte(t => t.Start, sourceStart)
                & filterBuilder.Lte(t => t.Start, sourceEnd);

            if (!string.IsNullOrEmpty(status) && status != "All" &&
                Enum.TryParse<SmartTaskManager.Models.Entities.TaskStatus>(status, out var parsedStatus))
                mongoFilter &= filterBuilder.Eq(t => t.Status, parsedStatus);

            var tasks = await _taskCollection.Find(mongoFilter).ToListAsync();
            var offset = targetStart.Date - sourceStart.Date;

            foreach (var task in tasks)
            {
                task.Start = task.Start.HasValue ? task.Start.Value + offset : null;
                task.End = task.End.HasValue ? task.End.Value + offset : null;
                task.LastUpdated = DateTime.UtcNow;
                await _taskCollection.ReplaceOneAsync(t => t.Id == task.Id, task);
            }

            return tasks.Count;
        }

        public async Task<int> BulkUpdateStatusAsync(string userId, DateTime? startDate, DateTime? endDate, string currentStatus, string newStatus)
        {
            if (!Enum.TryParse<SmartTaskManager.Models.Entities.TaskStatus>(newStatus, out var newTaskStatus))
                throw new ArgumentException($"Invalid status: {newStatus}");

            var filterBuilder = Builders<SmartTaskManager.Models.Entities.TaskEntity>.Filter;
            var mongoFilter = filterBuilder.Eq(t => t.UserId, userId);

            if (startDate.HasValue)
                mongoFilter &= filterBuilder.Gte(t => t.Start, startDate.Value);
            if (endDate.HasValue)
                mongoFilter &= filterBuilder.Lte(t => t.Start, endDate.Value);

            if (!string.IsNullOrEmpty(currentStatus) && currentStatus != "All" &&
                Enum.TryParse<SmartTaskManager.Models.Entities.TaskStatus>(currentStatus, out var parsedCurrent))
                mongoFilter &= filterBuilder.Eq(t => t.Status, parsedCurrent);

            var update = Builders<SmartTaskManager.Models.Entities.TaskEntity>.Update
                .Set(t => t.Status, newTaskStatus)
                .Set(t => t.LastUpdated, DateTime.UtcNow);

            var result = await _taskCollection.UpdateManyAsync(mongoFilter, update);
            return (int)result.ModifiedCount;
        }

        public async Task<int> BulkDeleteAsync(string userId, DateTime? startDate, DateTime? endDate, string status)
        {
            var filterBuilder = Builders<SmartTaskManager.Models.Entities.TaskEntity>.Filter;
            var mongoFilter = filterBuilder.Eq(t => t.UserId, userId);

            if (startDate.HasValue)
                mongoFilter &= filterBuilder.Gte(t => t.Start, startDate.Value);
            if (endDate.HasValue)
                mongoFilter &= filterBuilder.Lte(t => t.Start, endDate.Value);

            if (!string.IsNullOrEmpty(status) && status != "All" &&
                Enum.TryParse<SmartTaskManager.Models.Entities.TaskStatus>(status, out var parsedStatus))
                mongoFilter &= filterBuilder.Eq(t => t.Status, parsedStatus);

            var result = await _taskCollection.DeleteManyAsync(mongoFilter);
            return (int)result.DeletedCount;
        }

        public async Task<Dictionary<string, int>> GetTaskCountsByStatusAsync(string userId, DateTime? startDate, DateTime? endDate)
        {
            var filterBuilder = Builders<SmartTaskManager.Models.Entities.TaskEntity>.Filter;
            var mongoFilter = filterBuilder.Eq(t => t.UserId, userId);

            if (startDate.HasValue)
                mongoFilter &= filterBuilder.Gte(t => t.Start, startDate.Value);
            if (endDate.HasValue)
                mongoFilter &= filterBuilder.Lte(t => t.Start, endDate.Value);

            var tasks = await _taskCollection.Find(mongoFilter).ToListAsync();
            return tasks.GroupBy(t => t.Status.ToString())
                        .ToDictionary(g => g.Key, g => g.Count());
        }

    }

}