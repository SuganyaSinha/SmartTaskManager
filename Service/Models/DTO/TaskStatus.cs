using System.Text.Json.Serialization;

namespace SmartTaskManager.Models.DTO
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum TaskStatus
    {
        All,
        NotStarted,
        InProgress,
        Completed,
        Blocked
    }
}
