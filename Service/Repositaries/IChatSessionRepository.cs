using SmartTaskManager.Models.Entities;

namespace SmartTaskManager.Repositary
{
    public interface IChatSessionRepository
    {
        Task<ChatSessionEntity?> GetByIdAsync(string sessionId);
        Task<List<ChatSessionEntity>> GetByUserIdAsync(string userId);
        Task UpsertAsync(ChatSessionEntity session);
        Task DeleteAsync(string sessionId, string userId);
    }
}
