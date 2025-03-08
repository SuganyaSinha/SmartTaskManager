using SmartTaskManager.Models;

namespace SmartTaskManager.Repositary
{
    public interface IPromptRepositary
    {
        Task<List<Prompt>> GetPromptsByUserAsync(string userId);
        Task<Prompt> GetPromptByIdAsync(string id);
        Task CreatePromptAsync(Prompt prompt);
        Task<bool> DeletePromptAsync(string id);
    }
    
}