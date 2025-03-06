using MongoDB.Driver;
using SmartTaskManager.Data;
using SmartTaskManager.Models;

namespace SmartTaskManager.Repositary
{

    public class UserProfileRepositary : IUserProfileRepositary
    {
        private readonly MongoDbContext _context;
        private readonly IMongoCollection<UserProfile> _userProfileCollection;

        public UserProfileRepositary(MongoDbContext context)
        {
            _context = context;
            _userProfileCollection = _context.UserProfiles;
        }

        public async Task<List<UserProfile>> GetAllUserProfilesAsync() =>
            await _userProfileCollection.Find(_ => true).ToListAsync();

        public async Task<UserProfile?> GetUserProfileByIdAsync(string id) =>
            await _userProfileCollection.Find(task => task.Id == id).FirstOrDefaultAsync();

        public async Task CreateUserProfileAsync(UserProfile userProfile)
        {
            try{
                await _userProfileCollection.InsertOneAsync(userProfile);
            }
            catch(Exception ex)
            {
                var msg = ex.Message;
                throw;
            }
            
        }
            

        public async Task UpdateUserProfileAsync(string id, UserProfile userProfile) =>
            await _userProfileCollection.ReplaceOneAsync(t => t.Id == id, userProfile);

        public async Task DeleteUserProfileAsync(string id) =>
            await _userProfileCollection.DeleteOneAsync(userProfile => userProfile.Id == id);
    }

}