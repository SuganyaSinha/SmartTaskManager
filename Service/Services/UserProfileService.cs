// TODO: this service is no longer used and can be deleted.
using MongoDB.Driver;
using SmartTaskManager.Models;
using TaskManagerApi.Data;
using Microsoft.Extensions.Options;
using SmartTaskManager.Repositary;

namespace SmartTaskManager.Services
{
    public class UserProfileService
    {
        private readonly IUserProfileRepositary _userProfileRepositary;

        public UserProfileService(IUserProfileRepositary userProfileRepositary)
        {
            _userProfileRepositary = userProfileRepositary;
         }

        public async Task<List<UserProfile>> GetAllUserProfilesAsync()
        {
            return await _userProfileRepositary.GetAllUserProfilesAsync();
        }
        
        public async Task<UserProfile?> GetUserProfileByIdAsync(string id) 
        {
            return await _userProfileRepositary.GetUserProfileByIdAsync(id);
        }

        public async Task CreateUserProfileAsync(UserProfile profile) 
        {
            await _userProfileRepositary.CreateUserProfileAsync(profile);
        }

        public async Task UpdateUserProfileAsync(string id, UserProfile profile)
        {
            await _userProfileRepositary.UpdateUserProfileAsync(id,profile);      
        }

        public async Task DeleteUserProfileAsync(string id) 
        {
            await _userProfileRepositary.DeleteUserProfileAsync(id);
        }
    }
}
