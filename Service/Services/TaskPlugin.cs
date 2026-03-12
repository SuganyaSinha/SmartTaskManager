using System.ComponentModel;
using System.Text.Json;
using Microsoft.SemanticKernel;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;

namespace SmartTaskManager.Services
{
    /// <summary>
    /// Semantic Kernel plugin exposing task management operations as LLM-callable functions.
    ///
    /// Timezone contract:
    ///   - The LLM always passes dates in the USER'S LOCAL TIMEZONE (format: yyyy-MM-ddTHH:mm:ss, no Z).
    ///   - This plugin converts those local dates → UTC before querying the DB.
    ///   - Preview data shown to the user is formatted back in local time for readability.
    ///
    /// Preview functions store the pending operation in the session; execute is called
    /// directly by ConversationalChatService after user confirmation.
    /// </summary>
    public class TaskPlugin
    {
        private readonly ITaskRepository _taskRepository;
        private readonly string _userId;
        private readonly ChatSession _session;
        private readonly string _timeZone;   // IANA or Windows timezone ID

        private static readonly JsonSerializerOptions _compact = new() { WriteIndented = false };

        public TaskPlugin(ITaskRepository taskRepository, string userId, ChatSession session, string timeZone)
        {
            _taskRepository = taskRepository;
            _userId = userId;
            _session = session;
            _timeZone = timeZone;
        }

        [KernelFunction("query_tasks")]
        [Description("Search and return tasks matching filters. Use for questions like 'show me all blocked tasks' or 'what tasks do I have this week'.")]
        public async Task<string> QueryTasksAsync(
            [Description("Optional title keyword to search (case-insensitive partial match).")] string? title,
            [Description("Start of date range in the user's local timezone, format yyyy-MM-ddTHH:mm:ss (no Z). Null means no lower bound.")] string? startDate,
            [Description("End of date range in the user's local timezone, format yyyy-MM-ddTHH:mm:ss (no Z). Null means no upper bound.")] string? endDate,
            [Description("Task status filter: NotStarted, InProgress, Completed, Blocked, or All")] string status = "All",
            [Description("Optional priority filter: low, medium, high")] string? priority = null)
        {
            DateTime? start = LocalToUtc(startDate);
            DateTime? end = LocalToUtc(endDate);

            var filter = new TaskFilterRequest
            {
                Title = title,
                Start = start,
                End = end,
                Status = ParseStatus(status),
                Priority = priority
            };

            var tasks = await _taskRepository.GetTasksAsync(_userId, filter);

            var results = tasks.Take(50).Select(t => new QueryTaskResult
            {
                Id = t.Id ?? string.Empty,
                Title = t.Title ?? string.Empty,
                Start = FormatLocal(t.Start),
                End = FormatLocal(t.End),
                Status = t.Status.ToString(),
                Priority = t.Priority
            }).ToList();

            _session.QueryResults = results;

            var compact = results.Select(r => new
            {
                id = r.Id,
                title = r.Title,
                start = r.Start,
                end = r.End,
                status = r.Status,
                priority = r.Priority
            });

            return JsonSerializer.Serialize(compact, _compact);
        }

        [KernelFunction("bulk_reschedule_preview")]
        [Description("Preview what tasks would be moved if rescheduling to a new date. ALWAYS call this first before executing any reschedule.")]
        public async Task<string> BulkReschedulePreviewAsync(
            [Description("New start date (first day of the target range) in user's local timezone, format yyyy-MM-ddTHH:mm:ss")] string targetStart,
            [Description("Optional. Comma-separated list of task IDs to reschedule. Use when tasks were already retrieved earlier in the conversation. When provided, sourceStart, sourceEnd and status are ignored.")] string? taskIds = null,
            [Description("Start of source date range in user's local timezone, format yyyy-MM-ddTHH:mm:ss. Used only when taskIds is not provided.")] string? sourceStart = null,
            [Description("End of source date range in user's local timezone, format yyyy-MM-ddTHH:mm:ss. Used only when taskIds is not provided.")] string? sourceEnd = null,
            [Description("Optional status filter: NotStarted, InProgress, Completed, Blocked, or All. Used only when taskIds is not provided.")] string status = "All")
        {
            DateTime tgtUtc = LocalToUtcRequired(targetStart);

            List<TaskItem> tasks;
            List<string>? parsedIds = null;
            TimeSpan offset;

            if (!string.IsNullOrWhiteSpace(taskIds))
            {
                // Fetch tasks by explicit IDs from prior query results
                parsedIds = taskIds
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();

                var fetched = await Task.WhenAll(parsedIds.Select(id => _taskRepository.GetTaskByIdAsync(id)));
                tasks = fetched.Where(t => t != null && t.UserId == _userId).Cast<TaskItem>().ToList();

                // Offset is date-only (preserves each task's time-of-day)
                var minStart = tasks.Where(t => t.Start.HasValue).Min(t => t.Start!.Value);
                offset = tgtUtc.Date - minStart.Date;
            }
            else
            {
                // Fall back to date range + status filter
                DateTime srcUtc = LocalToUtcRequired(sourceStart ?? throw new ArgumentException("sourceStart is required when taskIds is not provided"));
                DateTime srcEndUtc = LocalToUtcRequired(sourceEnd ?? throw new ArgumentException("sourceEnd is required when taskIds is not provided"));
                offset = tgtUtc.Date - srcUtc.Date;

                var filter = new TaskFilterRequest
                {
                    Start = srcUtc,
                    End = srcEndUtc,
                    Status = ParseStatus(status)
                };
                tasks = await _taskRepository.GetTasksAsync(_userId, filter);
            }

            var previewTasks = tasks.Select(t => new PreviewTask
            {
                Id = t.Id ?? string.Empty,
                Title = t.Title ?? string.Empty,
                OldStart = FormatLocal(t.Start),
                OldEnd = FormatLocal(t.End),
                NewStart = t.Start.HasValue ? FormatLocal(t.Start.Value + offset) : null,
                NewEnd = t.End.HasValue ? FormatLocal(t.End.Value + offset) : null,
                Status = t.Status.ToString()
            }).ToList();

            _session.PendingOperation = new PendingOperation
            {
                OperationType = "reschedule",
                SourceStart = string.IsNullOrWhiteSpace(taskIds) ? LocalToUtc(sourceStart) : null,
                SourceEnd = string.IsNullOrWhiteSpace(taskIds) ? LocalToUtc(sourceEnd) : null,
                TargetStart = tgtUtc,
                Status = status,
                TaskIds = parsedIds,
                RescheduleOffset = offset,
                PreviewData = new PreviewData { AffectedCount = previewTasks.Count, Tasks = previewTasks }
            };

            return JsonSerializer.Serialize(new { affectedCount = previewTasks.Count, tasks = previewTasks }, _compact);
        }

        [KernelFunction("bulk_status_update_preview")]
        [Description("Preview what tasks would have their status changed. ALWAYS call this first before executing any status update.")]
        public async Task<string> BulkStatusUpdatePreviewAsync(
            [Description("New status to apply: NotStarted, InProgress, Completed, Blocked")] string newStatus,
            [Description("Current status of tasks to update: NotStarted, InProgress, Completed, Blocked. Ignored when taskIds are provided.")] string? currentStatus = null,
            [Description("Optional. Comma-separated list of task IDs to update. Use when tasks were already retrieved earlier in the conversation. When provided, startDate and endDate are ignored.")] string? taskIds = null,
            [Description("Start of date range in user's local timezone, format yyyy-MM-ddTHH:mm:ss. Used only when taskIds is not provided.")] string? startDate = null,
            [Description("End of date range in user's local timezone, format yyyy-MM-ddTHH:mm:ss. Used only when taskIds is not provided.")] string? endDate = null)
        {
            List<TaskItem> tasks;
            List<string>? parsedIds = null;

            if (!string.IsNullOrWhiteSpace(taskIds))
            {
                // Fetch tasks by explicit IDs from prior query results
                parsedIds = taskIds
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();

                var fetched = await Task.WhenAll(parsedIds.Select(id => _taskRepository.GetTaskByIdAsync(id)));
                tasks = fetched.Where(t => t != null && t.UserId == _userId).Cast<TaskItem>().ToList();
            }
            else
            {
                // Fall back to date + status filter
                DateTime? start = LocalToUtc(startDate);
                DateTime? end = LocalToUtc(endDate);

                var filter = new TaskFilterRequest
                {
                    Start = start,
                    End = end,
                    Status = ParseStatus(currentStatus)
                };
                tasks = await _taskRepository.GetTasksAsync(_userId, filter);
            }

            var previewTasks = tasks.Select(t => new PreviewTask
            {
                Id = t.Id ?? string.Empty,
                Title = t.Title ?? string.Empty,
                OldStart = FormatLocal(t.Start),
                Status = t.Status.ToString()
            }).ToList();

            _session.PendingOperation = new PendingOperation
            {
                OperationType = "status_update",
                StartDate = string.IsNullOrWhiteSpace(taskIds) ? LocalToUtc(startDate) : null,
                EndDate = string.IsNullOrWhiteSpace(taskIds) ? LocalToUtc(endDate) : null,
                CurrentStatus = currentStatus,
                NewStatus = newStatus,
                TaskIds = parsedIds,
                PreviewData = new PreviewData { AffectedCount = previewTasks.Count, Tasks = previewTasks }
            };

            return JsonSerializer.Serialize(new { affectedCount = previewTasks.Count, currentStatus, newStatus, tasks = previewTasks }, _compact);
        }

        [KernelFunction("bulk_delete_preview")]
        [Description("Preview which tasks would be deleted. ALWAYS call this first before executing any deletion.")]
        public async Task<string> BulkDeletePreviewAsync(
            [Description("Optional. Comma-separated list of task IDs to delete. Use when tasks were already retrieved earlier in the conversation. When provided, startDate, endDate and status are ignored.")] string? taskIds = null,
            [Description("Start of date range in user's local timezone, format yyyy-MM-ddTHH:mm:ss. Used only when taskIds is not provided.")] string? startDate = null,
            [Description("End of date range in user's local timezone, format yyyy-MM-ddTHH:mm:ss. Used only when taskIds is not provided.")] string? endDate = null,
            [Description("Status filter: NotStarted, InProgress, Completed, Blocked, or All. Used only when taskIds is not provided.")] string? status = null)
        {
            List<TaskItem> tasks;
            List<string>? parsedIds = null;

            if (!string.IsNullOrWhiteSpace(taskIds))
            {
                // Fetch tasks by explicit IDs from prior query results
                parsedIds = taskIds
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();

                var fetched = await Task.WhenAll(parsedIds.Select(id => _taskRepository.GetTaskByIdAsync(id)));
                tasks = fetched.Where(t => t != null && t.UserId == _userId).Cast<TaskItem>().ToList();
            }
            else
            {
                // Fall back to date + status filter
                DateTime? start = LocalToUtc(startDate);
                DateTime? end = LocalToUtc(endDate);

                var filter = new TaskFilterRequest
                {
                    Start = start,
                    End = end,
                    Status = ParseStatus(status)
                };
                tasks = await _taskRepository.GetTasksAsync(_userId, filter);
            }

            var previewTasks = tasks.Select(t => new PreviewTask
            {
                Id = t.Id ?? string.Empty,
                Title = t.Title ?? string.Empty,
                OldStart = FormatLocal(t.Start),
                Status = t.Status.ToString()
            }).ToList();

            _session.PendingOperation = new PendingOperation
            {
                OperationType = "delete",
                StartDate = string.IsNullOrWhiteSpace(taskIds) ? LocalToUtc(startDate) : null,
                EndDate = string.IsNullOrWhiteSpace(taskIds) ? LocalToUtc(endDate) : null,
                Status = status ?? "All",
                TaskIds = parsedIds,
                PreviewData = new PreviewData { AffectedCount = previewTasks.Count, Tasks = previewTasks }
            };

            return JsonSerializer.Serialize(new { affectedCount = previewTasks.Count, tasks = previewTasks }, _compact);
        }

        [KernelFunction("get_task_summary")]
        [Description("Get a high-level count summary by status. Use for questions like 'how am I doing this week?' or 'show me my task stats'.")]
        public async Task<string> GetTaskSummaryAsync(
            [Description("Start of date range in user's local timezone, format yyyy-MM-ddTHH:mm:ss. Null for all time.")] string? startDate,
            [Description("End of date range in user's local timezone, format yyyy-MM-ddTHH:mm:ss. Null for all time.")] string? endDate)
        {
            DateTime? start = LocalToUtc(startDate);
            DateTime? end = LocalToUtc(endDate);

            var counts = await _taskRepository.GetTaskCountsByStatusAsync(_userId, start, end);

            return JsonSerializer.Serialize(new
            {
                totalTasks = counts.Values.Where((_, i) => counts.Keys.ToArray()[i] != "All").Sum(),
                byStatus = counts
            }, _compact);
        }

        // ── Timezone helpers ──────────────────────────────────────────────────

        /// <summary>Converts a local-time string (from LLM) to UTC for DB queries.</summary>
        private DateTime? LocalToUtc(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            if (!DateTime.TryParse(value, null, System.Globalization.DateTimeStyles.NoCurrentDateDefault, out var dt))
                return null;

            dt = DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(_timeZone);
                return TimeZoneInfo.ConvertTimeToUtc(dt, tz);
            }
            catch
            {
                // Fallback: treat as UTC if timezone is unrecognized
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            }
        }

        private DateTime LocalToUtcRequired(string value)
        {
            if (!DateTime.TryParse(value, null, System.Globalization.DateTimeStyles.NoCurrentDateDefault, out var dt))
                throw new ArgumentException($"Invalid date: {value}");

            dt = DateTime.SpecifyKind(dt, DateTimeKind.Unspecified);
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(_timeZone);
                return TimeZoneInfo.ConvertTimeToUtc(dt, tz);
            }
            catch
            {
                return DateTime.SpecifyKind(dt, DateTimeKind.Utc);
            }
        }

        /// <summary>Formats a UTC date as the user's local time for display in previews.</summary>
        private string? FormatLocal(DateTime? utcDate)
        {
            if (!utcDate.HasValue) return null;
            try
            {
                var tz = TimeZoneInfo.FindSystemTimeZoneById(_timeZone);
                var local = TimeZoneInfo.ConvertTimeFromUtc(
                    DateTime.SpecifyKind(utcDate.Value, DateTimeKind.Utc), tz);
                return local.ToString("yyyy-MM-ddTHH:mm:ss");
            }
            catch
            {
                return utcDate.Value.ToString("yyyy-MM-ddTHH:mm:ss");
            }
        }

        private static SmartTaskManager.Models.DTO.TaskStatus ParseStatus(string? status) =>
            Enum.TryParse<SmartTaskManager.Models.DTO.TaskStatus>(status, ignoreCase: true, out var parsed)
                ? parsed
                : SmartTaskManager.Models.DTO.TaskStatus.All;
    }
}
