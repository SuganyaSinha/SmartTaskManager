using SmartTaskManager.Models.DTO;

namespace SmartTaskManager.Interfaces
{
    public interface IUserRoutineService
    {
        Task<RoutineProfile> GetUserRoutineAsync(string userId);  
        Task<RoutineProfile> CreateUserRoutineAsync(string userId, RoutineProfile routine);
        Task<RoutineProfile> UpdateUserRoutineAsync(string userId, RoutineProfile routine);
        Task DeleteUserRoutineAsync(string userId);
    }
}
