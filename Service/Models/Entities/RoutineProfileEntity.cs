using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace SmartTaskManager.Models.Entities
{
  public class RoutineProfileEntity
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("wakeUpTime")]
    public string WakeUpTime { get; set; } = string.Empty;

    [BsonElement("sleepTime")]
    public string SleepTime { get; set; } = string.Empty;

    [BsonElement("workStyleSettings")]
    [BsonIgnoreIfNull]
    public WorkStyleSettings? WorkStyleSettings { get; set; } = null;

    [BsonElement("constraints")]
    [BsonIgnoreIfNull]
    public Constraints? Constraints { get; set; } = null;

    [BsonElement("freeTextDescription")]
    public string FreeTextDescription { get; set; } = string.Empty;

    [BsonElement("lastUpdated")]
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}


public class WorkStyleSettings
{
    [BsonElement("workHourStart")]
    public string WorkHourStart { get; set; } = string.Empty;

    [BsonElement("workHourEnd")]
    public string WorkHourEnd { get; set; } = string.Empty;

    [BsonElement("productiveHours")]  
    [BsonRepresentation(BsonType.String)]
    [BsonIgnoreIfNull]  
    public  List<ProductiveHours>? ProductiveHours { get; set; } = null;

    [BsonElement("preferredTaskDuration")]
    public int PreferredTaskDuration { get; set; }
}
    
public class Constraints
{
    [BsonElement("noTaskBefore")]
    public string NoTaskBefore { get; set; } = string.Empty;

    [BsonElement("noTaskAfter")]
    public string NoTaskAfter { get; set; } = string.Empty;
}

public enum ProductiveHours
    {
        EarlyMorning,
        Morning,
        LateMorning,
        Afternoon,
        Evening,
        Night
    }

}
