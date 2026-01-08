using System;
using System.Text.Json.Serialization;

namespace SmartTaskManager.Models.DTO
{
    public class CreateTaskItem
    {
        public string Id { get; set; } = string.Empty;
        public string? Title { get; set; }
        public DateTime? Start { get; set; }
        public DateTime? End { get; set; }
        public string? Priority { get; set; }
        public string? Comments { get; set; }
        public string? UserId { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public TaskStatus Status { get; set; } = TaskStatus.NotStarted;
    }
}
