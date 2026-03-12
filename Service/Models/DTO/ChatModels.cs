using System.ComponentModel.DataAnnotations;
using Microsoft.SemanticKernel.ChatCompletion;

namespace SmartTaskManager.Models.DTO
{
    public class ChatRequest
    {
        public string SessionId { get; set; } = string.Empty;

        [Required(ErrorMessage = "UserMessage is required.")]
        [MaxLength(2000, ErrorMessage = "UserMessage cannot exceed 2000 characters.")]
        public string UserMessage { get; set; } = string.Empty;

        public string CurrentDate { get; set; } = string.Empty;
        public string TimeZone { get; set; } = string.Empty;
        public bool Confirmed { get; set; } = false;
    }

    public class ChatResponse
    {
        public string SessionId { get; set; } = string.Empty;

        /// <summary>answer | confirmation_required | operation_complete | tasks_created | clarifying_question | error</summary>
        public string MessageType { get; set; } = "answer";

        public string Message { get; set; } = string.Empty;
        public PreviewData? PreviewData { get; set; }
        public List<ScheduledTaskResult>? ScheduledTasks { get; set; }
        public List<QueryTaskResult>? QueryResults { get; set; }
    }

    public class QueryTaskResult
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? Start { get; set; }
        public string? End { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Priority { get; set; }
    }

    public class PreviewData
    {
        public int AffectedCount { get; set; }
        public List<PreviewTask> Tasks { get; set; } = new();
    }

    public class PreviewTask
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? OldStart { get; set; }
        public string? OldEnd { get; set; }
        public string? NewStart { get; set; }
        public string? NewEnd { get; set; }
        public string? Status { get; set; }
    }

    public class ChatSession
    {
        public string SessionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public ChatHistory History { get; set; } = new();
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;
        public PendingOperation? PendingOperation { get; set; }
        public List<QueryTaskResult>? QueryResults { get; set; }
    }

    public class PendingOperation
    {
        public string OperationType { get; set; } = string.Empty;  // "reschedule" | "status_update" | "delete"
        public DateTime? SourceStart { get; set; }
        public DateTime? SourceEnd { get; set; }
        public DateTime? TargetStart { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? CurrentStatus { get; set; }
        public string? NewStatus { get; set; }
        public string? Status { get; set; }
        /// <summary>When set, execute operates on these specific IDs instead of the date/status filter.</summary>
        public List<string>? TaskIds { get; set; }
        /// <summary>For reschedule-by-IDs: the offset to shift each task's Start and End.</summary>
        public TimeSpan? RescheduleOffset { get; set; }
        public PreviewData PreviewData { get; set; } = new();
    }
}
