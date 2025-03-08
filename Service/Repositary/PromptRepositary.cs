using MongoDB.Driver;
using SmartTaskManager.Data;
using SmartTaskManager.Models;

namespace SmartTaskManager.Repositary
{

    public class PromptRepositary : IPromptRepositary
    {
        private readonly MongoDbContext _context;
        private readonly IMongoCollection<Prompt> _promptCollection;

        public PromptRepositary(MongoDbContext context)
        {
            _context = context;
            _promptCollection = _context.Prompt;
        }

        public async Task<List<Prompt>> GetPromptsByUserAsync(string userId)
        {
            return await _promptCollection.Find(p => p.UserId == userId).ToListAsync();
        }
            
        public async Task<Prompt> GetPromptByIdAsync(string id){
            return await _promptCollection.Find(p => p.Id == id).FirstOrDefaultAsync();
        }

        public async Task CreatePromptAsync(Prompt prompt)
        {
            try{
                await _promptCollection.InsertOneAsync(prompt);
            }
            catch(Exception ex)
            {
                //TBD Log the exception
                var msg = ex.Message;
                throw;
            }           
        }
            
        public async Task<bool> DeletePromptAsync(string id)
        {
            var result = await _promptCollection.DeleteOneAsync(p => p.Id == id);
            return result.DeletedCount > 0;
        }
    }

}