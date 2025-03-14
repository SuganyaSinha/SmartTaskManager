using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartTaskManager.Models
{
    public class TaskItem
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [BsonElement("title")]
        public string Title { get; set; } = string.Empty;

        [BsonElement("start")]
        public DateTime Start { get; set; }

        [BsonElement("end")]
        public DateTime End { get; set; }

        [BsonElement("priority")]
        public string Priority { get; set; } = string.Empty;

        [BsonElement("comments")]
        public string Comments { get; set; } = string.Empty;

        [BsonElement("userid")]
         public string UserId { get; set; } = string.Empty;
    }
}
