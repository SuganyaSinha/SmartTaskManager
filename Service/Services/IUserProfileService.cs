using SmartTaskManager.Models;

namespace SmartTaskManager.Interfaces
{
    public interface IUserProfileService
    {
        Task<List<UserProfile>> GetAllUserProfilesAsync();
        Task<UserProfile?> GetUserProfileByIdAsync(string id);  
        Task CreateUserProfileAsync(UserProfile profile);
        Task UpdateUserProfileAsync(string id, UserProfile profile);
        Task DeleteUserProfileAsync(string id);
    }
}
