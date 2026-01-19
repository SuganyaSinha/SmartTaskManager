using System;
using System.Text.Json.Serialization;

namespace SmartTaskManager.Models.DTO
{
    public class TaskFilterRequest
    {
        public string? Title { get; set; }
        public DateTime? Start { get; set; }
        public DateTime? End { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public TaskStatus Status { get; set; } = TaskStatus.NotStarted;
    }
}