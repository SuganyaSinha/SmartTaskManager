using MongoDB.Driver;
using SmartTaskManager.Data;
using SmartTaskManager.Models.Entities;

namespace SmartTaskManager.Repositary
{
    public class ChatSessionRepository : IChatSessionRepository
    {
        private const int MaxSessionsPerUser = 5;

        private readonly IMongoCollection<ChatSessionEntity> _collection;
        private readonly ILogger<ChatSessionRepository> _logger;

        public ChatSessionRepository(MongoDbContext context, ILogger<ChatSessionRepository> logger)
        {
            _collection = context.ChatSessions;
            _logger = logger;
        }

        public async Task<ChatSessionEntity?> GetByIdAsync(string sessionId)
        {
            try
            {
                return await _collection.Find(s => s.SessionId == sessionId).FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching chat session {SessionId}", sessionId);
                throw;
            }
        }

        public async Task<List<ChatSessionEntity>> GetByUserIdAsync(string userId)
        {
            try
            {
                return await _collection
                    .Find(s => s.UserId == userId)
                    .SortByDescending(s => s.LastActivity)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching sessions for user {UserId}", userId);
                throw;
            }
        }

        public async Task UpsertAsync(ChatSessionEntity session)
        {
            try
            {
                var filter = Builders<ChatSessionEntity>.Filter.Eq(s => s.SessionId, session.SessionId);
                var update = Builders<ChatSessionEntity>.Update
                    .Set(s => s.Messages, session.Messages)
                    .Set(s => s.LastActivity, session.LastActivity)
                    .Set(s => s.Title, session.Title)
                    .Set(s => s.UserId, session.UserId)
                    .SetOnInsert(s => s.CreatedAt, session.CreatedAt);

                await _collection.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });

                // Enforce 5-session cap
                var all = await _collection
                    .Find(s => s.UserId == session.UserId)
                    .SortByDescending(s => s.LastActivity)
                    .ToListAsync();

                if (all.Count > MaxSessionsPerUser)
                {
                    var toDelete = all.Skip(MaxSessionsPerUser).Select(s => s.SessionId).ToList();
                    await _collection.DeleteManyAsync(
                        Builders<ChatSessionEntity>.Filter.In(s => s.SessionId, toDelete));

                    _logger.LogInformation(
                        "Session cap enforced for user {UserId}: deleted {Count} old session(s)",
                        session.UserId, toDelete.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error upserting chat session {SessionId}", session.SessionId);
                throw;
            }
        }

        public async Task DeleteAsync(string sessionId, string userId)
        {
            try
            {
                await _collection.DeleteOneAsync(s => s.SessionId == sessionId && s.UserId == userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting chat session {SessionId}", sessionId);
                throw;
            }
        }
    }
}
