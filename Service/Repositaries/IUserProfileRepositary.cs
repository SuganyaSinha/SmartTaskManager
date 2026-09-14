using SmartTaskManager.Models;

namespace SmartTaskManager.Repositary
{
    public interface IUserProfileRepositary
    {
        Task<List<UserProfile>> GetAllUserProfilesAsync();
        Task<UserProfile?> GetUserProfileByIdAsync(string id);  
        Task CreateUserProfileAsync(UserProfile task);
        Task UpdateUserProfileAsync(string id, UserProfile task);
        Task DeleteUserProfileAsync(string id);
    }
    
}