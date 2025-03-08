using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class UserProfile
{
    [BsonId]  
    public string Id { get; set; } = default!;  // OAuth ID

    [BsonElement("name")]
    public string Name { get; set; } = default!;

    [BsonElement("email")]
    public string Email { get; set; } = default!;

    [BsonElement("personality")]
    public string Personality { get; set; } = default!;

    [BsonElement("routine")]
    public Routine Routine { get; set; } = new();

    [BsonElement("preferences")]
    public Preferences Preferences { get; set; } = new();

    [BsonElement("lastUpdated")]
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}
