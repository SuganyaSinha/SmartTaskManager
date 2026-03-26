using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartTaskManager.Models.Entities
{
    public class ChatSessionEntity
    {
        [BsonId]
        [BsonRepresentation(BsonType.String)]
        public string SessionId { get; set; } = string.Empty;

        [BsonElement("userId")]
        public string UserId { get; set; } = string.Empty;

        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("messages")]
        public List<StoredMessage> Messages { get; set; } = new();

        [BsonElement("lastActivity")]
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public class StoredMessage
    {
        [BsonElement("role")]
        public string Role { get; set; } = string.Empty;

        [BsonElement("content")]
        public string Content { get; set; } = string.Empty;

        [BsonElement("timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Full ChatResponse serialized as JSON for assistant messages.
        /// Used by GetSessionMessages to return the identical object the client received live.
        /// Null for user messages.
        /// </summary>
        [BsonElement("responseJson")]
        [BsonIgnoreIfNull]
        public string? ResponseJson { get; set; }

        /// <summary>
        /// OpenAI tool_call_id for "tool" role messages.
        /// Needed to rehydrate tool-result messages into ChatHistory with the correct call linkage.
        /// </summary>
        [BsonElement("toolCallId")]
        [BsonIgnoreIfNull]
        public string? ToolCallId { get; set; }
    }
}
