using System;
using System.Text.Json.Serialization;

namespace SmartTaskManager.Models.DTO
{
    public class TaskItem
    {
        public required string Id { get; set; }
        public string? Title { get; set; }
        public DateTime? Start { get; set; }
        public DateTime? End { get; set; }
        public string? Priority { get; set; }
        public string? Comments { get; set; }
        public string? UserId { get; set; }

   
        public TaskStatus Status { get; set; } = TaskStatus.NotStarted;
    }
}
