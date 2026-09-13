using System.Text.Json.Serialization;

namespace SmartTaskManager.Models.DTO
{
    /// <summary>
    /// Returned by OpenAI in Phase 1 (intent extraction only).
    /// The AI parses the user's natural language - it does NOT make scheduling decisions.
    /// </summary>
    public class ParsedTaskRequest
    {
        public string Title { get; set; } = string.Empty;
        public int DurationMinutes { get; set; } = 60;
        public string Priority { get; set; } = "medium";     // "high" | "medium" | "low"
        public string TaskCategory { get; set; } = "work";   // "work" | "personal"
        public string? RequestedDate { get; set; }            // "YYYY-MM-DD" or null
        public string? RequestedTime { get; set; }            // "HH:mm" (24h) or null
        public bool IsRecurring { get; set; } = false;
        public string RecurrenceType { get; set; } = "none";  // "none"|"daily"|"weekly"|"monthly"
        public int RecurrenceCount { get; set; } = 1;
        public string? Comments { get; set; }
    }

    /// <summary>
    /// Returned to the client after server-side scheduling.
    /// Times are in the user's local timezone (no Z suffix), matching the
    /// format that LLMPlanningService already produces so the client can use either endpoint.
    /// </summary>
    public class ScheduledTaskResult
    {
        public string Title { get; set; } = string.Empty;
        public string Day { get; set; } = string.Empty;          // e.g. "Wednesday"
        public string Start { get; set; } = string.Empty;        // "2026-02-18T17:30"
        public string End { get; set; } = string.Empty;          // "2026-02-18T18:30"
        public string Priority { get; set; } = "medium";
        public string TaskCategory { get; set; } = "work";       // "work" | "personal"
        public string Comments { get; set; } = string.Empty;
        public bool IsRecurring { get; set; } = false;
        public string RecurrenceType { get; set; } = "none";

        /// <summary>True when the task was placed at a different time than what the user requested.</summary>
        public bool IsAllocatedOutsideRequestedTime { get; set; } = false;

        /// <summary>
        /// Human-readable explanation of why the task was moved: conflict, day full,
        /// before wakeup, after sleep, invalid date, etc.
        /// Empty string when the task was placed exactly as requested.
        /// </summary>
        public string AllocationNote { get; set; } = string.Empty;
    }

    /// <summary>
    /// Internal scheduling primitive - represents any occupied time window (local time).
    /// Tracks both existing DB tasks and tasks scheduled within the current request
    /// to prevent double-booking across a multi-task scheduling session.
    /// </summary>
    internal class TimeBlock
    {
        public DateTime Start { get; set; }
        public DateTime End { get; set; }
    }
}
