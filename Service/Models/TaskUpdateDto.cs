using System;

namespace SmartTaskManager.Models
{
    public class TaskUpdateDto
    {
        public string? Title { get; set; }
        public DateTime? Start { get; set; }
        public DateTime? End { get; set; }
        public string? Priority { get; set; }
        public string? Comments { get; set; }
    }
}
