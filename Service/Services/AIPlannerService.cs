using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using MongoDB.Driver.Core.Events;
using MongoDB.Driver.Linq;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;


public class AIPlannerService
{
    private readonly Kernel _kernel;
    private readonly ITaskRepository _taskRepositary;

    private readonly IUserRoutineRepositary _userRoutineRepositary;

    public AIPlannerService(Kernel kernel,
                            ITaskRepository taskRepositary,
                            IUserRoutineRepositary userRoutineRepositary)
    {
        _kernel = kernel;
        _taskRepositary = taskRepositary;
        _userRoutineRepositary = userRoutineRepositary;
    }

    public async Task<string> GenerateTaskAsync(OpenAiRequestBody input, string userId)
    {
        var chatCompletionService  = _kernel.GetRequiredService<IChatCompletionService>();
        string existingTasksJson = await GetExistingTasksForTheUser(userId, input.TimeZone);
        string routineSummary = await GetUserRoutine(userId);
        

        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(GetInitialSystemPrompt()
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
        string output = result.Content!;
        return output;
    //     KernelFunction systemPromptFunction = _kernel.CreateFunctionFromPrompt(
    //         GetInitialSystemPrompt(),
    //         functionName: "CreateInitialSystemPrompt",
    //         description: "Generate the initial system prompt for task planning"
    //     );

    }
     private string GetInitialSystemPrompt()
    {
        return 
       @"You are an intelligent task planner. Your job is to analyze the user's tasks and determine the best way to schedule them. If the user does not specify a timing, suggest the best possible time based on typical productivity hours (e.g., morning for high-priority tasks, afternoon for reviews, evening for personal tasks). Give breaks between the tasks so that brain is not overloaded. Given the following instructions, generate a structured list of tasks in raw JSON format without any escaped characters, newlines, or additional formatting.

        ### Instructions:
        1. Each task should include the following fields:
        - **title**: Name of the task.
        - **day**: Day of the week (e.g., ""Monday"") based on the LOCAL date of the task.
        - **start**: Start time in LOCAL time (ISO-like format: ""YYYY-MM-DDTHH:mm"")
        - **end**: End time in LOCAL time (ISO-like format: ""YYYY-MM-DDTHH:mm"")
        - **priority**: Task priority (high, medium, low).
        - **comments**: Short description of the task.

        2. **User's routine profile and preferences**
        [INSERT_ROUTINE_SUMMARY_HERE]
    
        2. **Existing Schedule Context**:
        - The user has the following pre-existing tasks (read-only, do not modify or reschedule these):
            [INSERT_EXISTING_TASKS_HERE]
        - Consider the time slots occupied by these existing tasks when scheduling new tasks. Avoid overlapping with existing tasks and ensure the user's total daily load (existing + new tasks) does not exceed 8 hours per day.

        3. **Scheduling Rules for New Tasks**:
        - Only schedule new tasks based on the user's latest input. Do not alter, delete, or reschedule any existing tasks from the context.
        - If time is given (e.g., ""6-7""), interpret as local time (e.g., 6 PM to 7 PM).
        - NEVER schedule tasks in the past relative to the user's current local datetime.
        - Schedule new tasks around the existing tasks, leaving at least a 30-minute break between tasks (existing or new).
        - If the user's daily load (existing + new tasks) would exceed 8 hours, prioritize scheduling new tasks on a different day or reduce the scope (e.g., shorten duration) with a comment explaining the adjustment.

        4. **Formatting Requirements**:
        - Return only valid JSON as a compact array on a single line.
        - Do not include any explanations, extra text, newlines (`\n`), indentation, or additional whitespace.
        - Do not enclose the JSON in quotes or use any escape characters (e.g., `\r\n`, `\n`).
        - Ensure double quotes are not escaped with backslashes (e.g., use ""title"" not \""title\"").
        - Output must be a raw, unescaped JSON array that can be directly parsed.

        ## Example Output (Strict JSON Format):
        [{""title"":""Do yoga"",""day"":""Wednesday"",""start"":""2026-01-28T17:00"",""end"":""2026-01-28T18:00"",""priority"":""medium"",""comments"":""Do yoga on Wednesday at 5 PM.""}]

        Now, generate tasks based on these instructions with current date ""[currentDate]"" and users current timezone as ""[currentTimeZone]"" and return only a valid JSON array without extra formatting.
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

        // Weekend inference from free text
        if (!string.IsNullOrWhiteSpace(routine.FreeTextDescription))
        {
            if (routine.FreeTextDescription.Contains("weekend", StringComparison.OrdinalIgnoreCase) &&
                routine.FreeTextDescription.Contains("9", StringComparison.OrdinalIgnoreCase))
            {
                sb.AppendLine($"- More details about user's routine: {routine.FreeTextDescription}");
            }
        }

        return sb.ToString().Trim();

    }

    private async Task<string> GetExistingTasksForTheUser(string userId, string userTimeZone)
    {
        var now = DateTime.UtcNow;

        var startRange = now.AddDays(-30);
        var endRange = now.AddDays(30);

        // First call: NotStarted
        var notStartedFilter = new TaskFilterRequest
        {
            Status = (SmartTaskManager.Models.DTO.TaskStatus)SmartTaskManager.Models.Entities.TaskStatus.NotStarted,
            Start = startRange,
            End = endRange
        };

        var notStartedTasks = await _taskRepositary.GetTasksAsync(userId, notStartedFilter);

        // Second call: InProgress
        var inProgressFilter = new TaskFilterRequest
        {
            Status = (SmartTaskManager.Models.DTO.TaskStatus)SmartTaskManager.Models.Entities.TaskStatus.InProgress,
            Start = startRange,
            End = endRange
        };

        var inProgressTasks = await _taskRepositary.GetTasksAsync(userId, inProgressFilter);

        // Combine results
        var tasks = notStartedTasks
            .Concat(inProgressTasks)
            .ToList();

     
        TimeZoneInfo? userLocalTimeZone = TimeZoneInfo.FindSystemTimeZoneById(userTimeZone);

        var tasksForOpenAi = tasks.Select(t => new OpenAiTaskItem
        {
    
            Title = t.Title ?? string.Empty,
            Start = t.Start.HasValue ? TimeZoneInfo.ConvertTimeFromUtc( // convert to user's local time
                                       DateTime.SpecifyKind(t.Start.Value, DateTimeKind.Utc), //get utc time from db
                                       userLocalTimeZone // user's local timezone
                                       ).ToString("yyyy-MM-ddTHH:mm:ss") : string.Empty, // return empty string if null
            End = t.End.HasValue ? TimeZoneInfo.ConvertTimeFromUtc(
                                   DateTime.SpecifyKind(t.End.Value, DateTimeKind.Utc),
                                   userLocalTimeZone
                                   ).ToString("yyyy-MM-ddTHH:mm:ss") : string.Empty,
            Status = t.Status,
            Priority = t.Priority ?? string.Empty,
            Comments = t.Comments ?? string.Empty
        }).ToList();

        string jsonString = JsonSerializer.Serialize(
                            tasksForOpenAi, new JsonSerializerOptions { WriteIndented = true });

        return jsonString;
    }
}
