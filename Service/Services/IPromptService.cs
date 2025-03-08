using SmartTaskManager.Models;

namespace SmartTaskManager.Interfaces
{
        public interface IPromptService
    {
        Task<List<Prompt>> GetPromptsByUserAsync(string userId);
        Task<Prompt> GetPromptByIdAsync(string id);
        Task CreatePromptAsync(Prompt prompt);
        Task<bool> DeletePromptAsync(string id);
    }
}