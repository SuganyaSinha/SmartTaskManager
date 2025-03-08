using MongoDB.Driver;
using SmartTaskManager.Models;

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

        public IMongoCollection<TaskItem> TaskCollection => _database.GetCollection<TaskItem>("Task");

        public IMongoCollection<UserProfile> UserProfiles => _database.GetCollection<UserProfile>("UserProfiles");

        public IMongoCollection<Prompt> Prompt => _database.GetCollection<Prompt>("Prompts");
    }

}

