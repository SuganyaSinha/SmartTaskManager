using System.Text.Json.Serialization;

namespace SmartTaskManager.Models.DTO
{
         [JsonConverter(typeof(JsonStringEnumConverter))]
    public enum TaskStatus
    {
        NotStarted,
        InProgress,
        Completed,
        Blocked
    }
}
