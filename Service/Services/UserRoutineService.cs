using MongoDB.Driver;
using SmartTaskManager.Models.DTO;
using Microsoft.Extensions.Options;
using SmartTaskManager.Repositary;

namespace SmartTaskManager.Services
{
    public class UserRoutineService
    {
        private readonly IUserRoutineRepositary _userRoutineRepositary;

        public UserRoutineService(IUserRoutineRepositary userRoutineRepositary)
        {
            _userRoutineRepositary = userRoutineRepositary;
        }

        public async Task<RoutineProfile> GetUserRoutineAsync(string userId)
        {
            return await _userRoutineRepositary.GetUserRoutineAsync(userId);
        }

        public async Task<RoutineProfile> CreateUserRoutineAsync(string userId, RoutineProfile routine)
        {
            return await _userRoutineRepositary.CreateUserRoutineAsync(userId, routine);
        }

        public async Task<RoutineProfile> UpdateUserRoutineAsync(string userId, RoutineProfile routine)
        {
            return await _userRoutineRepositary.UpdateUserRoutineAsync(userId, routine);
        }

        public async Task DeleteUserRoutineAsync(string userId)
        {
            await _userRoutineRepositary.DeleteUserRoutineAsync(userId);
        }     
    }
}
