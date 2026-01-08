namespace SmartTaskManager.Models.DTO
{
    public class OpenAiTaskItem
    {
        public string? Title { get; set; } = string.Empty;
        public DateTime? Start { get; set; }
        public DateTime? End { get; set; }
        public string? Priority { get; set; } = string.Empty;
        public string? Comments { get; set; } = string.Empty;
        public TaskStatus Status { get; set; } = TaskStatus.NotStarted;
    }
}
