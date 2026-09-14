using System.Text.Json;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using SmartTaskManager.Models.DTO;

namespace SmartTaskManager.Services
{
    public class DashboardSnapshotService
    {
        private readonly Kernel _kernel;
        private readonly TaskService _taskService;
        private readonly ILogger<DashboardSnapshotService> _logger;

        public DashboardSnapshotService(
            [FromKeyedServices("chat")] Kernel kernel,
            TaskService taskService,
            ILogger<DashboardSnapshotService> logger)
        {
            _kernel = kernel;
            _taskService = taskService;
            _logger = logger;
        }

        public async Task<DashboardSnapshot> GenerateSnapshotAsync(string userId, string? timeZone)
        {
            List<TaskItem> tasks;
            try
            {
                tasks = await _taskService.GetTasksAsync(userId, new TaskFilterRequest());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load tasks for dashboard snapshot for user {UserId}", userId);
                return BuildFallbackSnapshot([], 0, [], []);
            }

            var nowUtc = DateTime.UtcNow;
            var userNow = ConvertUtcToUserTime(nowUtc, timeZone);
            var today = userNow.Date;

            var openTasks = tasks
                .Where(t => t.Status != Models.DTO.TaskStatus.Completed)
                .Where(t => t.Start.HasValue)
                .Select(t => new
                {
                    t.Title,
                    Start = ConvertUtcToUserTime(t.Start!.Value, timeZone),
                    End = t.End.HasValue ? ConvertUtcToUserTime(t.End.Value, timeZone) : (DateTime?)null,
                    Priority = string.IsNullOrWhiteSpace(t.Priority) ? "medium" : t.Priority,
                    Status = t.Status.ToString(),
                    Category = t.Category ?? string.Empty,
                    Comments = t.Comments ?? string.Empty
                })
                .ToList();

            var overdue = openTasks
                .Where(t => t.Start.Date < today)
                .OrderByDescending(t => PriorityRank(t.Priority))
                .ThenBy(t => t.Start)
                .Take(12)
                .ToList();

            var upcoming = openTasks
                .Where(t => t.Start.Date >= today)
                .OrderBy(t => t.Start)
                .Take(10)
                .ToList();

            var taskContext = new
            {
                Now = userNow.ToString("yyyy-MM-ddTHH:mm:ss"),
                TimeZone = string.IsNullOrWhiteSpace(timeZone) ? "UTC" : timeZone,
                Counts = new
                {
                    Total = tasks.Count,
                    Open = openTasks.Count,
                    Overdue = openTasks.Count(t => t.Start.Date < today),
                    Upcoming = openTasks.Count(t => t.Start.Date >= today),
                    HighPriorityOpen = openTasks.Count(t => string.Equals(t.Priority, "high", StringComparison.OrdinalIgnoreCase)),
                    Completed = tasks.Count(t => t.Status == Models.DTO.TaskStatus.Completed),
                    InProgress = tasks.Count(t => t.Status == Models.DTO.TaskStatus.InProgress),
                    Blocked = tasks.Count(t => t.Status == Models.DTO.TaskStatus.Blocked)
                },
                OverdueTasks = overdue.Select(t => new PromptTask(
                    t.Title,
                    t.Start.ToString("yyyy-MM-ddTHH:mm"),
                    t.End?.ToString("yyyy-MM-ddTHH:mm"),
                    DaysFromToday(t.Start, today),
                    t.Priority,
                    t.Status,
                    t.Category,
                    t.Comments)),
                UpcomingTasks = upcoming.Select(t => new PromptTask(
                    t.Title,
                    t.Start.ToString("yyyy-MM-ddTHH:mm"),
                    t.End?.ToString("yyyy-MM-ddTHH:mm"),
                    DaysFromToday(t.Start, today),
                    t.Priority,
                    t.Status,
                    t.Category,
                    t.Comments))
            };

            var history = new ChatHistory();
            history.AddSystemMessage("""
                You are SmartTask's executive-function assistant. Create a useful dashboard triage, not a generic summary.

                Requirements:
                - Base your response only on the supplied task JSON.
                - Decide what the user should do next. Name the exact task that should be first when one exists.
                - Prioritize in this order: blocked, high-priority overdue, oldest overdue, in-progress overdue, due today, next upcoming.
                - If several overdue tasks exist, group the situation into a short recovery plan instead of saying only "multiple tasks are overdue."
                - Use dates/age when helpful, for example "overdue since Jan 25" or "due today at 3:00 PM".
                - Do not invent task names, times, counts, categories, or deadlines.
                - Avoid alarmist filler like "Immediate Action Required" unless every open item is high priority and overdue.
                - Keep the card compact: headline under 7 words, detail under 90 characters, and exactly 3 ordered action bullets.
                - Each bullet must be under 95 characters.
                - Bullet style must be action-oriented:
                  1. "Do first: <task/action>"
                  2. "Then: <next task/action>"
                  3. "Watch: <upcoming risk or what can wait>"
                - Return only valid JSON with this exact shape:
                  {"headline":"...","detail":"...","bullets":["...","...","..."],"tone":"urgent|active|calm"}
                - Use tone "urgent" when overdue or blocked work needs attention, "active" when upcoming work exists without urgent pressure, otherwise "calm".
                """);
            history.AddUserMessage(JsonSerializer.Serialize(taskContext));

            try
            {
                var chatService = _kernel.GetRequiredService<IChatCompletionService>();
                var response = await chatService.GetChatMessageContentAsync(
                    history,
                    new OpenAIPromptExecutionSettings { MaxTokens = 600 },
                    _kernel);

                var snapshot = ParseSnapshot(response.Content);
                if (snapshot != null)
                {
                    return snapshot;
                }

                _logger.LogWarning("Dashboard AI snapshot returned invalid JSON for user {UserId}: {Content}", userId, response.Content);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Dashboard AI snapshot generation failed for user {UserId}", userId);
            }

            return BuildFallbackSnapshot(tasks, openTasks.Count, overdue, upcoming);
        }

        private static DashboardSnapshot? ParseSnapshot(string? content)
        {
            if (string.IsNullOrWhiteSpace(content))
            {
                return null;
            }

            var cleaned = content.Trim();
            if (cleaned.StartsWith("```", StringComparison.Ordinal))
            {
                cleaned = cleaned.Replace("```json", "", StringComparison.OrdinalIgnoreCase)
                    .Replace("```", "", StringComparison.Ordinal)
                    .Trim();
            }

            var snapshot = JsonSerializer.Deserialize<DashboardSnapshot>(
                cleaned,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (snapshot == null || string.IsNullOrWhiteSpace(snapshot.Headline))
            {
                return null;
            }

            snapshot.Bullets = snapshot.Bullets
                .Where(b => !string.IsNullOrWhiteSpace(b))
                .Take(3)
                .ToList();
            snapshot.Tone = snapshot.Tone is "urgent" or "active" or "calm" ? snapshot.Tone : "calm";
            snapshot.IsAiGenerated = true;
            return snapshot;
        }

        private static DashboardSnapshot BuildFallbackSnapshot(
            List<TaskItem> tasks,
            int openCount,
            IEnumerable<dynamic> overdueTasks,
            IEnumerable<dynamic> upcomingTasks)
        {
            var overdue = overdueTasks.ToList();
            var upcoming = upcomingTasks.ToList();
            var firstOverdue = overdue.FirstOrDefault();
            var nextUpcoming = upcoming.FirstOrDefault();
            var tone = overdue.Count > 0 ? "urgent" : upcoming.Count > 0 ? "active" : "calm";

            return new DashboardSnapshot
            {
                Headline = firstOverdue != null
                    ? $"Start recovery with {firstOverdue.Title}."
                    : nextUpcoming != null
                        ? $"Next focus: {nextUpcoming.Title}."
                        : "No immediate task pressure.",
                Detail = "AI snapshot is temporarily unavailable, so this fallback is using the same task-priority context without model reasoning.",
                Bullets =
                [
                    firstOverdue != null ? $"Do first: {firstOverdue.Title} ({firstOverdue.Priority}, overdue since {firstOverdue.Start:MMM d})." : $"{openCount} open task{(openCount == 1 ? "" : "s")}.",
                    overdue.Count > 1 ? $"Then: clear {overdue.Skip(1).First().Title} before newer work." : nextUpcoming != null ? $"Then: prepare {nextUpcoming.Title} for {nextUpcoming.Start:MMM d}." : "Then: keep the board clear.",
                    nextUpcoming != null ? $"Watch: {nextUpcoming.Title} is the next scheduled item." : $"{tasks.Count(t => t.Status == Models.DTO.TaskStatus.Completed)} completed."
                ],
                Tone = tone,
                IsAiGenerated = false
            };
        }

        private static int PriorityRank(string? priority) =>
            string.Equals(priority, "high", StringComparison.OrdinalIgnoreCase) ? 3 :
            string.Equals(priority, "medium", StringComparison.OrdinalIgnoreCase) ? 2 :
            string.Equals(priority, "low", StringComparison.OrdinalIgnoreCase) ? 1 : 0;

        private static int DaysFromToday(DateTime taskStart, DateTime today) =>
            (taskStart.Date - today).Days;

        private static DateTime ConvertUtcToUserTime(DateTime value, string? timeZone)
        {
            var utc = value.Kind == DateTimeKind.Utc
                ? value
                : DateTime.SpecifyKind(value, DateTimeKind.Utc);

            if (string.IsNullOrWhiteSpace(timeZone))
            {
                return utc;
            }

            try
            {
                return TimeZoneInfo.ConvertTimeFromUtc(utc, TimeZoneInfo.FindSystemTimeZoneById(timeZone));
            }
            catch (TimeZoneNotFoundException)
            {
                return utc;
            }
            catch (InvalidTimeZoneException)
            {
                return utc;
            }
        }

        private sealed record PromptTask(
            string? Title,
            string Start,
            string? End,
            int DaysFromToday,
            string Priority,
            string Status,
            string Category,
            string Comments);
    }
}
