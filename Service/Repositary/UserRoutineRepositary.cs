using AutoMapper;
using MongoDB.Driver;
using SmartTaskManager.Data;
using SmartTaskManager.Models.Entities;
using SmartTaskManager.Models.DTO;

namespace SmartTaskManager.Repositary
{

    public class UserRoutineRepositary : IUserRoutineRepositary
    {
        private readonly MongoDbContext _context;
        private readonly IMapper _mapper;
        private readonly IMongoCollection<RoutineProfileEntity> _routineCollection;

        public UserRoutineRepositary(MongoDbContext context, IMapper mapper)
        {
            _context = context;
            _mapper = mapper;
            _routineCollection = _context.UserRoutines;
        }
        public async Task<RoutineProfile> GetUserRoutineAsync(string userId)
        {
            var routineEntity = await _routineCollection
                .Find(r => r.UserId == userId)
                .FirstOrDefaultAsync();

             return _mapper.Map<RoutineProfile>(routineEntity);
        }

        public async Task<RoutineProfile> CreateUserRoutineAsync(string userId, RoutineProfile routine)
        {
            try{

                var existingRoutine = await _routineCollection
                .Find(r => r.UserId == userId)
                .FirstOrDefaultAsync();

                if (existingRoutine != null)
                {
                    throw new Exception("User already has a routine.");
                }

                var routineEntity = _mapper.Map<RoutineProfileEntity>(routine);
                routineEntity.Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString();
                routineEntity.UserId = userId;
                routineEntity.LastUpdated = DateTime.UtcNow;
                
                await _routineCollection.InsertOneAsync(routineEntity); 
                return _mapper.Map<RoutineProfile>(routineEntity);
            }
            catch(Exception ex)
            {
                var msg = ex.Message;  
                throw new Exception("Failed to create routine: " + msg);         
            }

        }

        public async Task<RoutineProfile> UpdateUserRoutineAsync(string userId, RoutineProfile inputRoutine)
        {
             var existingRoutine = await _routineCollection
                .Find(r => r.UserId == userId)
                .FirstOrDefaultAsync();

            var filter = Builders<RoutineProfileEntity>
                            .Filter.Eq(x => x.UserId, userId);

            var updates = new List<UpdateDefinition<RoutineProfileEntity>>();

            if (existingRoutine.WakeUpTime != inputRoutine.WakeUpTime)
                updates.Add(Builders<RoutineProfileEntity>
                    .Update.Set(x => x.WakeUpTime, inputRoutine.WakeUpTime));

            if (existingRoutine.SleepTime != inputRoutine.SleepTime)
                updates.Add(Builders<RoutineProfileEntity>
                    .Update.Set(x => x.SleepTime, inputRoutine.SleepTime));

            if (existingRoutine.FreeTextDescription != inputRoutine.FreeTextDescription)
                updates.Add(Builders<RoutineProfileEntity>
                    .Update.Set(x => x.FreeTextDescription, inputRoutine.FreeTextDescription));

            if (inputRoutine.WorkStyleSettings != null)
            {
                updates.Add(Builders<RoutineProfileEntity>
                    .Update.Set(x => x.WorkStyleSettings, new WorkStyleSettings
                    {
                        WorkHourStart = inputRoutine.WorkStyleSettings.WorkHourStart,
                        WorkHourEnd = inputRoutine.WorkStyleSettings.WorkHourEnd,
                        ProductiveHours = inputRoutine.WorkStyleSettings.ProductiveHours?
                            .Select(ph => (SmartTaskManager.Models.Entities.ProductiveHours)ph)
                            .ToList(),
                        PreferredTaskDuration = inputRoutine.WorkStyleSettings.PreferredTaskDuration
                    }));
            }
            else if (existingRoutine.WorkStyleSettings != null && inputRoutine.WorkStyleSettings == null)
            {
                updates.Add(Builders<RoutineProfileEntity>
                    .Update.Set(x => x.WorkStyleSettings, null));
            }

            if (inputRoutine.Constraints != null)
            {
                updates.Add(Builders<RoutineProfileEntity>
                    .Update.Set(x => x.Constraints, new Constraints
                    {
                        NoTaskBefore = inputRoutine.Constraints.NoTaskBefore,
                        NoTaskAfter = inputRoutine.Constraints.NoTaskAfter
                    }));
            }
            else if (existingRoutine.Constraints != null && inputRoutine.Constraints == null)
            {
                updates.Add(Builders<RoutineProfileEntity>
                    .Update.Set(x => x.Constraints, null));
            }

            updates.Add(Builders<RoutineProfileEntity>
                .Update.Set(x => x.LastUpdated, DateTime.UtcNow));

            if (updates.Count == 0)
                return new RoutineProfile();

            var update = Builders<RoutineProfileEntity>
                .Update.Combine(updates);

            try
            {
                
                await _routineCollection.UpdateOneAsync(filter, update);
                var updatedRoutine = await _routineCollection
                    .Find(filter)
                    .FirstOrDefaultAsync();
                return _mapper.Map<RoutineProfile>(updatedRoutine);
            }
            catch(Exception ex)
            {
                var msg = ex.Message;  
                throw new Exception("Failed to update routine: " + msg);         
            }
        }

        public async Task DeleteUserRoutineAsync(string userId)
        {
            try
            {
                await _routineCollection.DeleteOneAsync(r => r.UserId == userId);
            }
            catch(Exception ex)
            {
                var msg = ex.Message;  
                throw new Exception("Failed to delete routine: " + msg);         
            }
        }
    }

}