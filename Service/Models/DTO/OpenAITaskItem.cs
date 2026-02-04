namespace SmartTaskManager.Models.DTO
{
    public class OpenAiTaskItem
    {
        public string? Title { get; set; } = string.Empty;
        public string Start { get; set; }
        public string End { get; set; }
        public string? Priority { get; set; } = string.Empty;
        public string? Comments { get; set; } = string.Empty;
        public TaskStatus Status { get; set; } = TaskStatus.NotStarted;
    }
}
