using System.Text.Json;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;


public class LLMPlanningService
{
    private readonly Kernel _kernel;
    private readonly ITaskRepository _taskRepositary;
    private readonly IUserRoutineRepositary _userRoutineRepositary;
    private readonly ILogger<LLMPlanningService> _logger;

    public LLMPlanningService(Kernel kernel,
                            ITaskRepository taskRepositary,
                            IUserRoutineRepositary userRoutineRepositary,
                            ILogger<LLMPlanningService> logger)
    {
        _kernel = kernel;
        _taskRepositary = taskRepositary;
        _userRoutineRepositary = userRoutineRepositary;
        _logger = logger;
    }

    public async Task<string> GenerateTaskAsync(TaskPlanningRequest input, string userId)
    {
        try
        {
            var chatCompletionService  = _kernel.GetRequiredService<IChatCompletionService>();
            string existingTasksJson = await GetExistingTasksForTheUser(userId, input.TimeZone);
            string routineSummary = await GetUserRoutine(userId);

            var chatHistory = new ChatHistory();
            chatHistory.AddSystemMessage(GetInitialSystemPromptNew()
                                        .Replace("[INSERT_EXISTING_TASKS_HERE]", existingTasksJson)
                                        .Replace("[INSERT_ROUTINE_SUMMARY_HERE]", routineSummary)
                                        .Replace("[currentDate]", input.CurrentDate)
                                        .Replace("[currentTimeZone]", input.TimeZone)
                                        );

            chatHistory.AddUserMessage(input.UserInput);

            var result = await chatCompletionService.GetChatMessageContentAsync(
                                                    chatHistory,
                                                    new OpenAIPromptExecutionSettings
                                                    {
                                                        MaxTokens = 200
                                                    },
                                                    _kernel
                                );
            if (string.IsNullOrWhiteSpace(result.Content))
            {
                _logger.LogWarning("Empty response from AI for user {UserId}", userId);
                return "[]";
            }

            return result.Content;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating task plan for user {UserId}", userId);
            throw;
        }
    }

    private string GetInitialSystemPromptNew()
    {
        return 
        @"You are an intelligent task planner. Your job is to take the tasks from the user's latest message and schedule every single one of them.

CRITICAL RULES (you MUST obey these at all times):
- NEVER return an empty array. You must schedule EVERY task provided by the user.
- All start times MUST be strictly AFTER the current datetime [currentDate] ([currentTimeZone]). Never schedule anything in the past or at the current moment.
- Total scheduled hours per day (existing + new tasks) MUST NOT exceed 8 hours. If adding a task would break this limit, automatically move it to the next available day.
- Leave at least 15 minutes break between any tasks (existing or new) on the same day.
- When the user does NOT specify a date or time for a task, you MUST find the best future slot by following the exact algorithm below. Do not return empty or say ""no slot"".

User's routine profile:
[INSERT_ROUTINE_SUMMARY_HERE]

Existing Schedule Context (read-only, do not modify):
If a day is not listed below, it means there are no existing tasks for that day and you can schedule new tasks freely (still respecting the 8 h limit and 15 min breaks).
[INSERT_EXISTING_TASKS_HERE]

Scheduling Algorithm (follow exactly, in this order):

1. Parse every task from the user's latest message (title, optional date/time, priority, duration, comments). 
   - Infer missing values: priority = ""medium"" if not given, duration = 1 hour default unless obvious otherwise.
2. Sort tasks by priority: high → medium → low.
3. For each task (one by one):
   a. If user gave a specific date/time:
      - If it conflicts with existing tasks, is in the past, or would exceed 8 h → ignore the requested time and treat it as ""unspecified"" (go to step b).
   b. If no time or conflict occurred:
      - Start searching from [currentDate] onward, day by day.
      - On each day, look only at OpenSlots that are large enough for (task duration + 15 min break before and after).
      - Prefer productive windows when possible.
      - Pick the earliest valid slot that keeps the day ≤ 8 h total.
      - If the day is already at/near 8 h, immediately jump to the next day and repeat.
4. If a high-priority task has no perfect slot, you may place it in the absolute earliest available slot even if it slightly violates productive time (but still respect 8 h limit and 15 min breaks).

Output Requirements:
- Return ONLY a compact, valid JSON array on a single line.
- No explanations, no newlines, no extra spaces, no escaped characters, no markdown, no quotes around the whole thing.
- Every object must have exactly these fields:
  - ""title""
  - ""day"" → full day name e.g. ""Wednesday""
  - ""start"" → ""2026-02-18T17:30"" (local time, 24 h, no seconds, no Z)
  - ""end"" → same format
  - ""priority"" → ""high"" | ""medium"" | ""low""
  - ""comments"" → short description (mention if you moved it because of full day or weekend preference)

Example of correct output (exactly this style):
[{""title"":""Do yoga"",""day"":""Wednesday"",""start"":""2026-02-18T17:30"",""end"":""2026-02-18T18:30"",""priority"":""medium"",""comments"":""Do yoga on Wednesday at 5:30 PM after existing tasks.""}]

Current datetime: [currentDate]
Timezone: [currentTimeZone]

Now schedule the tasks from the user's message using the rules above and output only the raw JSON array.
        ";
    }


    private async Task<string> GetUserRoutine(string userId)
    {
        var routine = await _userRoutineRepositary.GetUserRoutineAsync(userId);
        if (routine == null)
        {
            return string.Empty; // or some default routine
        }

        return BuildRoutineSummary(routine);        
    }

    private string BuildRoutineSummary(RoutineProfile routine)
    {
        if (routine == null)
        {
            return "";
        }
        var sb = new System.Text.StringBuilder();

        // Awake window
        if (!string.IsNullOrWhiteSpace(routine.WakeUpTime) &&
            !string.IsNullOrWhiteSpace(routine.SleepTime))
        {
            sb.AppendLine($"- Awake from {routine.WakeUpTime} to {routine.SleepTime}");
        }

        // Work hours
        if (routine.WorkStyleSettings != null &&
            !string.IsNullOrWhiteSpace(routine.WorkStyleSettings.WorkHourStart) &&
            !string.IsNullOrWhiteSpace(routine.WorkStyleSettings.WorkHourEnd))
        {
            sb.AppendLine($"- Works from {routine.WorkStyleSettings.WorkHourStart} to {routine.WorkStyleSettings.WorkHourEnd}");
        }

        // Productive hours
        if (routine.WorkStyleSettings != null &&
            routine.WorkStyleSettings.ProductiveHours != null && 
            routine.WorkStyleSettings.ProductiveHours.Any())
        {
            var productive = string.Join(", ", routine.WorkStyleSettings.ProductiveHours);
            sb.AppendLine($"- Most productive during: {productive}");
        }

        // Constraints
        if (routine.Constraints != null)
        {
            if (!string.IsNullOrWhiteSpace(routine.Constraints.NoTaskBefore))
            {
                sb.AppendLine($"- Avoid scheduling before {routine.Constraints.NoTaskBefore}");
            }

            if (!string.IsNullOrWhiteSpace(routine.Constraints.NoTaskAfter))
            {
                sb.AppendLine($"- Avoid scheduling after {routine.Constraints.NoTaskAfter}");
            }
        }

        // Include free text description if present
        if (!string.IsNullOrWhiteSpace(routine.FreeTextDescription))
        {
            sb.AppendLine($"- Additional routine details: {routine.FreeTextDescription}");
        }

        return sb.ToString().Trim();

    }

    private async Task<string> GetExistingTasksForTheUser(string userId, string userTimeZone)
    {
        try
        {
        var now = DateTime.UtcNow;
        var startRange = now.AddDays(-5);
        var endRange = now.AddDays(30);

        var notStartedFilter = new TaskFilterRequest
        {
            Status = (SmartTaskManager.Models.DTO.TaskStatus)SmartTaskManager.Models.Entities.TaskStatus.NotStarted,
            Start = startRange,
            End = endRange
        };

        var inProgressFilter = new TaskFilterRequest
        {
            Status = (SmartTaskManager.Models.DTO.TaskStatus)SmartTaskManager.Models.Entities.TaskStatus.InProgress,
            Start = startRange,
            End = endRange
        };

        // Run both queries in parallel
        var notStartedTask = _taskRepositary.GetTasksAsync(userId, notStartedFilter);
        var inProgressTask = _taskRepositary.GetTasksAsync(userId, inProgressFilter);
        var results = await Task.WhenAll(notStartedTask, inProgressTask);
        
        var tasks = results[0].Concat(results[1]).ToList();

        TimeZoneInfo userLocalTimeZone;
        try
        {
            userLocalTimeZone = TimeZoneInfo.FindSystemTimeZoneById(userTimeZone);
        }
        catch (TimeZoneNotFoundException)
        {
            _logger.LogWarning("Invalid timezone '{TimeZone}' for user {UserId}, defaulting to UTC", userTimeZone, userId);
            userLocalTimeZone = TimeZoneInfo.Utc;
        }

        var localTasks = tasks
            .Where(t => t.Start.HasValue && t.End.HasValue)
            .Select(t =>
            {
                var localStart = TimeZoneInfo.ConvertTimeFromUtc(
                    DateTime.SpecifyKind(t.Start.Value, DateTimeKind.Utc),
                    userLocalTimeZone);

                var localEnd = TimeZoneInfo.ConvertTimeFromUtc(
                    DateTime.SpecifyKind(t.End.Value, DateTimeKind.Utc),
                    userLocalTimeZone);

                return new
                {
                    Title = t.Title ?? string.Empty,
                    Start = localStart,
                    End = localEnd,
                    Date = localStart.Date,
                    DurationHours = (localEnd - localStart).TotalHours,
                    Status = t.Status,
                    Priority = t.Priority ?? string.Empty,
                    Comments = t.Comments ?? string.Empty
                };
            })
            .OrderBy(t => t.Date)
            .ThenBy(t => t.Start)
            .ToList();

        // Group tasks by date with open slots
        var groupedTasks = localTasks
            .GroupBy(t => t.Date)
            .OrderBy(g => g.Key)
            .Select(g =>
        {
            var day = g.Key;

            // Find open slots for the day
            var dayStart = day.Date;                      // 12:00:00 AM
            var dayEnd = day.Date.AddDays(1).AddSeconds(-1);   // e.g. 23:00

            var dayTasks = g.OrderBy(t => t.Start).ToList();
            var openSlots = new List<object>();

            DateTime cursor = dayStart;

            foreach (var task in dayTasks)
            {
                // If there's a gap between cursor and task start
                if (task.Start > cursor)
                {
                    openSlots.Add(new
                    {
                        Start = cursor.ToString("yyyy-MM-ddTHH:mm:ss"),
                        End = task.Start.ToString("yyyy-MM-ddTHH:mm:ss"),
                        DurationHours = Math.Round((task.Start - cursor).TotalHours, 2)
                    });
                }

                // Move cursor forward
                cursor = task.End > cursor ? task.End : cursor;
            }

            // Gap after last task
            if (cursor < dayEnd)
            {
                openSlots.Add(new
                {
                    Start = cursor.ToString("yyyy-MM-ddTHH:mm:ss"),
                    End = dayEnd.ToString("yyyy-MM-ddTHH:mm:ss"),
                    DurationHours = Math.Round((dayEnd - cursor).TotalHours, 2)
                });
            }

            return new
            {
                Date = day.ToString("yyyy-MM-dd"),
                TotalScheduledHours = Math.Round(g.Sum(t => t.DurationHours), 2),
                Tasks = dayTasks.Select(t => new
                {
                    Title = t.Title,
                    Start = t.Start.ToString("yyyy-MM-ddTHH:mm:ss"),
                    End = t.End.ToString("yyyy-MM-ddTHH:mm:ss"),
                    Priority = t.Priority,
                    Comments = t.Comments,
                    Status = t.Status,
                    DurationHours = Math.Round(t.DurationHours, 2)
                }).ToList(),
                OpenSlots = openSlots
            };
        })
        .ToList();

        string jsonString = JsonSerializer.Serialize(
                            groupedTasks, new JsonSerializerOptions { WriteIndented = true });

        return jsonString;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching existing tasks for user {UserId}", userId);
            throw;
        }
    }
}
