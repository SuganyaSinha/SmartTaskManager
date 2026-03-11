using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartTaskManager.Models.Entities
{
    public class TaskEntity
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("start")]
        public DateTime? Start { get; set; } = null;

        [BsonElement("end")]
        public DateTime? End { get; set; } = null;

        [BsonElement("priority")]
        public string Priority { get; set; } = string.Empty;

        [BsonElement("comments")]
        public string Comments { get; set; } = string.Empty;

        [BsonElement("userid")]
         public string UserId { get; set; } = string.Empty;

        [BsonElement("status")]
        [BsonRepresentation(BsonType.String)]   
        public TaskStatus Status { get; set; } = TaskStatus.NotStarted;

        [BsonElement("createdTime")]
        public DateTime? CreatedTime { get; set; } = null;

        [BsonElement("lastUpdated")]
        public DateTime? LastUpdated { get; set; } = null;

        [BsonElement("completedAt")]
        public DateTime? CompletedAt { get; set; } = null;

        [BsonElement("category")]
        public string? Category { get; set; } = null;
    }

        public enum TaskStatus
    {
        All,
        NotStarted,
        InProgress,
        Completed,
        Blocked
    }

}
