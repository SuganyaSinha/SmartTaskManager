using System.Text.Json;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;


public class AIPlannerService
{
    private readonly Kernel _kernel;
    private readonly ITaskRepository _taskRepositary;

    public AIPlannerService(Kernel kernel,
                            ITaskRepository taskRepositary)
    {
        _kernel = kernel;
        _taskRepositary = taskRepositary;
    }

    public async Task<string> GenerateTaskAsync(OpenAiRequestBody input, string userId)
    {
        var chatCompletionService  = _kernel.GetRequiredService<IChatCompletionService>();
        string existingTasksJson = await GetExistingTasksForTheUser(userId);

        var chatHistory = new ChatHistory();
        chatHistory.AddSystemMessage(GetInitialSystemPrompt()
                                    .Replace("[INSERT_EXISTING_TASKS_HERE]", existingTasksJson).Replace("[currentDate]", input.CurrentDate));
                                   // );


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
        - **start**: Start time in ISO 8601 UTC format with 'Z' suffix (e.g., ""2025-03-21T22:00:00Z""). This MUST be the UTC time, not local time.
        - **end**: End time in ISO 8601 UTC format with 'Z' suffix (e.g., ""2025-03-21T23:00:00Z""). This MUST be the UTC time, not local time.
        - **priority**: Task priority (high, medium, low).
        - **comments**: Short description of the task.

        2. **Date Interpretation Rules**:
        - User's current local date and time: ""[currentDate]"" (e.g., ""2025-03-25T19:50:18-07:00"" for PDT).
        - While converting Start time to UTC, if it is falling into next day, change the start date also to next date.
        - While converting End time to UTC, if it is rolling into next day, change the end date also to next date.

        3. **Existing Schedule Context**:
        - The user has the following pre-existing tasks (read-only, do not modify or reschedule these):
            [INSERT_EXISTING_TASKS_HERE]
        - Consider the time slots occupied by these existing tasks when scheduling new tasks. Avoid overlapping with existing tasks and ensure the user's total daily load (existing + new tasks) does not exceed 8 hours per day.

        4. **Scheduling Rules for New Tasks**:
        - Only schedule new tasks based on the user's latest input. Do not alter, delete, or reschedule any existing tasks from the context.
        - If time is given (e.g., ""6-7""), interpret as local time (e.g., 6 PM to 7 PM).
        - Schedule new tasks around the existing tasks, leaving at least a 30-minute break between tasks (existing or new).
        - If the user's daily load (existing + new tasks) would exceed 8 hours, prioritize scheduling new tasks on a different day or reduce the scope (e.g., shorten duration) with a comment explaining the adjustment.

        5. **Formatting Requirements**:
        - Return only valid JSON as a compact array on a single line.
        - Do not include any explanations, extra text, newlines (`\n`), indentation, or additional whitespace.
        - Do not enclose the JSON in quotes or use any escape characters (e.g., `\r\n`, `\n`).
        - Ensure double quotes are not escaped with backslashes (e.g., use ""title"" not \""title\"").
        - Output must be a raw, unescaped JSON array that can be directly parsed.

        ## Example Output (Strict JSON Format):
        [{""title"":""Do yoga"",""day"":""Wednesday"",""start"":""2025-03-27T00:00:00Z"",""end"":""2025-03-27T00:30:00Z"",""priority"":""medium"",""comments"":""Do yoga on Wednesday at 5 PM.""}]

        Now, generate tasks based on these instructions with current date ""[currentDate]"" and return only a valid JSON array without extra formatting.
        ";

    }

    private async Task<string> GetExistingTasksForTheUser(string userId)
    {
        var tasks = await _taskRepositary.GetAllTasksAsync(userId);

        var tasksForOpenAi = tasks.Select(t => new OpenAiTaskItem
        {
            Title = t.Title ?? string.Empty,
            Start = t.Start,
            End = t.End,
            Status = t.Status,
            Priority = t.Priority ?? string.Empty,
            Comments = t.Comments ?? string.Empty
        }).ToList();

        string jsonString = JsonSerializer.Serialize(
                            tasksForOpenAi, new JsonSerializerOptions { WriteIndented = true });

        return jsonString;
    }
}
