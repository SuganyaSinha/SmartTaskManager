using SmartTaskManager.Models.Entities;
using SmartTaskManager.Models.DTO;


namespace SmartTaskManager.Repositary
{
    public interface IUserRoutineRepositary
    {
        Task<RoutineProfile> GetUserRoutineAsync(string userId);  
        Task<RoutineProfile> CreateUserRoutineAsync(string userId, RoutineProfile routine);
        Task<RoutineProfile> UpdateUserRoutineAsync(string userId, RoutineProfile routine);
        Task DeleteUserRoutineAsync(string userId);
    }
    
}