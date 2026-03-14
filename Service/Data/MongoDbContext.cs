using MongoDB.Driver;
using SmartTaskManager.Models;
using SmartTaskManager.Models.Entities;

namespace SmartTaskManager.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration config)
        {
            var client = new MongoClient(config["MongoDB:ConnectionString"]);
            _database = client.GetDatabase(config["MongoDB:DatabaseName"]);
        }

        public IMongoCollection<TaskEntity> TaskCollection => _database.GetCollection<TaskEntity>("Tasks");

        public IMongoCollection<UserProfile> UserProfiles => _database.GetCollection<UserProfile>("UserProfiles");

        public IMongoCollection<RoutineProfileEntity> UserRoutines => _database.GetCollection<RoutineProfileEntity>("UserRoutines");

        public IMongoCollection<Prompt> Prompt => _database.GetCollection<Prompt>("Prompts");

        public IMongoCollection<ChatSessionEntity> ChatSessions => _database.GetCollection<ChatSessionEntity>("ChatSessions");
    }

}

