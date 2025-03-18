using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using SmartTaskManager.Repositary;

public class OpenAiService
{
    private readonly HttpClient _httpClient;
    private readonly ITaskRepository taskRepositary;
    private readonly string _apiKey;

    private List<Dictionary<string, string>> _conversationHistory = new();

    public OpenAiService(IHttpClientFactory httpClientFactory,
                         ITaskRepository _taskRepositary,
                         IOptions<OpenAiConfig> config)
    {
        _httpClient = httpClientFactory.CreateClient();
        taskRepositary = _taskRepositary;
        _apiKey = config.Value.ApiKey;
    }
        /*
        _conversationHistory.Add(new Dictionary<string, string> { 
        { "role", "system" }, 
        { "content",  @"You are an intelligent task planner. Your job is to analyze the user's tasks and determine the best way to schedule them.  

🔹 **Detect the timeframe:**  
   - If the tasks seem for a single day, set `""timeframe"": ""day""`.  
   - If tasks are for multiple days, set `""timeframe"": ""week""`.  

🔹 **Detect Overload:**  
   - If total estimated hours exceed **12 hours per day**, mark `""overloaded"": true`.  
   - If total estimated hours is less than **12 hours per day**, mark `""overloaded"": false`.

🔹 **Handle Weekly Plans:**  
   - If the user specifies tasks for different days, track them separately under `""days""`.  
   - Each day's `""overloaded""` status is calculated individually.  

🔹 **Output Structured JSON with:**  
   - `""timeframe""`: `""day""` or `""week""`  
   - `""overloaded""`: `true/false` (for a day plan)  
   - `""days""`: Contains each day's tasks & overload status.  
   - `""tasks""`: List of tasks with  
     - `""name""`  
     - `""category""` (Study, Work, Health, etc.)  
     - `""time_in_hours""`  
     - `""priority""` (`""high""`, `""medium""`, `""low""`)  

---

### **📝 Example Outputs**
#### **🔹 Case 1: Day Plan, Not Overloaded**
{
    ""timeframe"": ""day"",
    ""days"": {
        ""Wednesday"": {
            ""overloaded"": false,
            ""tasks"": [
                { ""name"": ""Prepare for Exam"", ""category"": ""Study"", ""time_in_hours"": 1, ""priority"": ""high"" },
                { ""name"": ""Work on AI Project"", ""category"": ""Development"", ""time_in_hours"": 3, ""priority"": ""high"" }
            ]
        }
    }
}
#### **🔹 Case 2: Day Plan, Overloaded**
{
    ""timeframe"": ""day"",
    ""days"": {
        ""Friday"": {
            ""overloaded"": true,
            ""tasks"": [
                { ""name"": ""Prepare for Exam"", ""category"": ""Study"", ""time_in_hours"": 6, ""priority"": ""high"" },
                { ""name"": ""Work on AI Project"", ""category"": ""Development"", ""time_in_hours"": 7, ""priority"": ""high"" }
            ]
        }
    }
}
#### **🔹 Case 3: Weekly Plan with Overloaded days**
{
    ""timeframe"": ""week"",
    ""days"": {
        ""Wednesday"": {
            ""overloaded"": true,
            ""tasks"": [
                { ""name"": ""Prepare for Exam"", ""category"": ""Study"", ""time_in_hours"": 6, ""priority"": ""high"" },
                { ""name"": ""Work on AI Project"", ""category"": ""Development"", ""time_in_hours"": 8, ""priority"": ""high"" }
            ]
        },
        ""Friday"": {
            ""overloaded"": false,
            ""tasks"": [
                { ""name"": ""Workout"", ""category"": ""Health"", ""time_in_hours"": 2, ""priority"": ""low"" },
                { ""name"": ""Research Paper"", ""category"": ""Study"", ""time_in_hours"": 3, ""priority"": ""medium"" }
            ]
        }
    }
}
Plan users tasks. Follow the structured format exactly.

"  } });
*/
/*
var initialSystemPrompt = GetInitialSystemPrompt();
_conversationHistory.Add(new Dictionary<string, string> { 
{ "role", "system" }, {"content", initialSystemPrompt}

{ "content",  @"You are an intelligent task planner. Your job is to analyze the user's tasks and determine the best way to schedule them. If the user does not specify a timing, suggest the best possible time based on typical productivity hours (e.g., morning for high-priority tasks, afternoon for reviews, evening for personal tasks). Give breaks between the tasks so that brain is not overloaded. Given the following instructions, generate a structured list of tasks in raw JSON format without any escaped characters, newlines, or additional formatting.

### Instructions:
1. Each task should include the following fields:
   - **title**: Name of the task.
   - **day**: Day of the week (e.g., ""Monday"").
   - **start**: Start time in ISO 8601 format (e.g., ""2025-03-24T08:00:00"").
   - **end**: End time in ISO 8601 format (e.g., ""2025-03-24T11:00:00"").
   - **priority**: Task priority (high, medium, low).
   - **comments**: Short description of the task.

2. **Date Interpretation Rules**:
   - The current date is 2025-03-11.
   - If the user specifies a day of the week (e.g., ""Monday""), interpret it as the next occurrence of that day in the upcoming week relative to the current date (2025-03-11). For example:
     - If today is Tuesday, 2025-03-11, and the user says ""Monday"", schedule the task for the next Monday, which is 2025-03-17.
     - If the user says ""Wednesday"", schedule the task for the next Wednesday, which is 2025-03-12.
   - If the user specifies a month (e.g., ""April""), schedule tasks only within that month of the current year (2025). Do not schedule tasks beyond the specified month. For example:
     - If the user says ""In April, every Friday"", schedule tasks for Fridays in April 2025 only (e.g., April 4, April 11, April 18, April 25).
     - Do not extend into May or any other month unless explicitly stated.
   - If the user specifies a recurring pattern like ""every alternate Friday"", start from the first occurrence of that day in the specified month and schedule every other occurrence within that month only. For example:
     - If the user says ""In April, every alternate Friday"", start with the first Friday in April 2025 (April 4) and schedule on alternate Fridays (April 4, April 18), excluding any dates outside April (e.g., do not include May 2).
   - If the user specifies a duration (e.g., ""3 hours""), calculate the end time by adding the duration to the start time, ensuring breaks between tasks.
   - If no duration is specified, assume a default duration of 1 hour for each task.

3. **Formatting Requirements**:
   - Return only valid JSON as a compact array on a single line.
   - Do not include any explanations, extra text, newlines (`\n`), indentation, or additional whitespace.
   - Do not enclose the JSON in quotes or use any escape characters (e.g., `\r\n`, `\n`).
   - Ensure double quotes are not escaped with backslashes (e.g., use ""title"" not \""title\"").
   - Output must be a raw, unescaped JSON array that can be directly parsed.

## Example Output (Strict JSON Format):
[{""title"":""Plan weekly team meeting"",""day"":""Friday"",""start"":""2025-03-21T09:00:00"",""end"":""2025-03-21T10:00:00"",""priority"":""high"",""comments"":""Discuss project milestones and assign tasks for the week.""}]

Now, generate tasks based on these instructions and return only a valid JSON array without extra formatting.
"}


});*/


    private async Task<string> GetExistingTasksForTheUser(string userId)
    {
        var tasks = await taskRepositary.GetAllTasksAsync(userId);
        string jsonString = JsonSerializer.Serialize(
                            tasks, new JsonSerializerOptions { WriteIndented = true });

        return jsonString;
    }

    private async Task<string> GetInitialSystemPrompt(string userId)
    {
        string currentDate = DateTime.UtcNow.ToString("yyyy-MM-dd");
        int currentYear = DateTime.UtcNow.Year;

        var result = await GetExistingTasksForTheUser(userId);

        return 
        @"You are an intelligent task planner. Your job is to analyze the user's tasks and determine the best way to schedule them. If the user does not specify a timing, suggest the best possible time based on typical productivity hours (e.g., morning for high-priority tasks, afternoon for reviews, evening for personal tasks). Give breaks between the tasks so that brain is not overloaded. Given the following instructions, generate a structured list of tasks in raw JSON format without any escaped characters, newlines, or additional formatting.

### Instructions:
1. Each task should include the following fields:
   - **title**: Name of the task.
   - **day**: Day of the week (e.g., ""Monday"").
   - **start**: Start time in ISO 8601 format (e.g., ""2025-03-24T08:00:00"").
   - **end**: End time in ISO 8601 format (e.g., ""2025-03-24T11:00:00"").
   - **priority**: Task priority (high, medium, low).
   - **comments**: Short description of the task.

2. **Date Interpretation Rules**:
   - The current date is 2025-03-11.
   - If the user specifies a day of the week (e.g., ""Monday""), interpret it as the next occurrence of that day in the upcoming week relative to the current date (2025-03-11). For example:
     - If today is Tuesday, 2025-03-11, and the user says ""Monday"", schedule the task for the next Monday, which is 2025-03-17.
     - If the user says ""Wednesday"", schedule the task for the next Wednesday, which is 2025-03-12.
   - If the user specifies a month (e.g., ""April""), schedule tasks only within that month of the current year (2025). Do not schedule tasks beyond the specified month. For example:
     - If the user says ""In April, every Friday"", schedule tasks for Fridays in April 2025 only (e.g., April 4, April 11, April 18, April 25).
     - Do not extend into May or any other month unless explicitly stated.
   - If the user specifies a recurring pattern like ""every alternate Friday"", start from the first occurrence of that day in the specified month and schedule every other occurrence within that month only. For example:
     - If the user says ""In April, every alternate Friday"", start with the first Friday in April 2025 (April 4) and schedule on alternate Fridays (April 4, April 18), excluding any dates outside April (e.g., do not include May 2).
   - If the user specifies a duration (e.g., ""3 hours""), calculate the end time by adding the duration to the start time, ensuring breaks between tasks.
   - If no duration is specified, assume a default duration of 1 hour for each task.

3. **Formatting Requirements**:
   - Return only valid JSON as a compact array on a single line.
   - Do not include any explanations, extra text, newlines (`\n`), indentation, or additional whitespace.
   - Do not enclose the JSON in quotes or use any escape characters (e.g., `\r\n`, `\n`).
   - Ensure double quotes are not escaped with backslashes (e.g., use ""title"" not \""title\"").
   - Output must be a raw, unescaped JSON array that can be directly parsed.

## Example Output (Strict JSON Format):
[{""title"":""Plan weekly team meeting"",""day"":""Friday"",""start"":""2025-03-21T09:00:00"",""end"":""2025-03-21T10:00:00"",""priority"":""high"",""comments"":""Discuss project milestones and assign tasks for the week.""}]

Now, generate tasks based on these instructions and return only a valid JSON array without extra formatting.
";

    }

    public async Task<string> GetResponseAsync(string userInput, string userId)
    {
        var initialSystemPrompt = await GetInitialSystemPrompt(userId);
        _conversationHistory.Add(new Dictionary<string, string>
         { 
            { "role", "system" }, 
            { "content", initialSystemPrompt}
          });
        
        _conversationHistory.Add(new Dictionary<string, string> 
        { 
            { "role", "user" },
            { "content", userInput } 
        });

        var requestBody = new
        {
            model = "gpt-3.5-turbo", // Use gpt-3.5-turbo for cost-effectiveness
            //messages = new[] { new { role = "user", content = userInput } },
            messages = _conversationHistory, 
            
            max_tokens = 200 // Limit token usage to reduce cost
        };

        var requestContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", requestContent);
        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Error from OpenAI API: {response.StatusCode}");
        }

        var responseBody = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(responseBody);
        var assistantResponse = jsonDoc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "No response";
         _conversationHistory.Add(new Dictionary<string, string> { { "role", "assistant" }, { "content", assistantResponse } });

        return assistantResponse;

        //return jsonDoc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "No response";
        

        /*

        var messages = new List<Dictionary<string, string>>
    {
        new() 
        { 
            { "role", "system" }, 
            { "content", @"You are an intelligent task planner. Your job is to analyze the user's tasks and determine the best way to schedule them.  

🔹 **Detect the timeframe:**  
   - If the tasks seem for a single day, set `""timeframe"": ""day""`.  
   - If tasks are for multiple days, set `""timeframe"": ""week""`.  

🔹 **Detect Overload:**  
   - If total estimated hours exceed **12 hours per day**, mark `""overloaded"": true`.  
   - If total estimated hours is less than **12 hours per day**, mark `""overloaded"": false`.  

🔹 **Handle Weekly Plans:**  
   - If the user specifies tasks for different days, track them separately under `""days""`.  
   - Each day's `""overloaded""` status is calculated individually.  

🔹 **Output Structured JSON with:**  
   - `""timeframe""`: `""day""` or `""week""`  
   - `""overloaded""`: `true/false` (for a day plan)  
   - `""days""`: If timeframe is `""week""`, contains each day's tasks & overload status.  
   - `""tasks""`: List of tasks with  
     - `""name""`  
     - `""category""` (Study, Work, Health, etc.)  
     - `""time_in_hours""`  
     - `""priority""` (`""high""`, `""medium""`, `""low""`)  

---

### **📝 Example Outputs**
#### **🔹 Case 1: Day Plan, Not Overloaded**
```json
{
    ""timeframe"": ""day"",
    ""overloaded"": false,
    ""tasks"": [
        { ""name"": ""Study for SAT"", ""category"": ""Study"", ""time_in_hours"": 3, ""priority"": ""high"" },
        { ""name"": ""Gym"", ""category"": ""Health"", ""time_in_hours"": 1, ""priority"": ""low"" }
    ]
}
#### **🔹 Case 2: Day Plan, Overloaded**
{
    ""timeframe"": ""day"",
    ""overloaded"": true,
    ""tasks"": [
        { ""name"": ""Study for SAT"", ""category"": ""Study"", ""time_in_hours"": 6, ""priority"": ""high"" },
        { ""name"": ""Project Work"", ""category"": ""Development"", ""time_in_hours"": 7, ""priority"": ""high"" }
    ]
}
#### **🔹 Case 3: Weekly Plan with Overloaded days**
{
    ""timeframe"": ""week"",
    ""days"": {
        ""Monday"": {
            ""overloaded"": true,
            ""tasks"": [
                { ""name"": ""Prepare for Exam"", ""category"": ""Study"", ""time_in_hours"": 6, ""priority"": ""high"" },
                { ""name"": ""Work on AI Project"", ""category"": ""Development"", ""time_in_hours"": 7, ""priority"": ""high"" }
            ]
        },
        ""Tuesday"": {
            ""overloaded"": false,
            ""tasks"": [
                { ""name"": ""Workout"", ""category"": ""Health"", ""time_in_hours"": 2, ""priority"": ""low"" },
                { ""name"": ""Research Paper"", ""category"": ""Study"", ""time_in_hours"": 3, ""priority"": ""medium"" }
            ]
        }
    }
}

" } },
 new() { { "role", "user" }, { "content", $"Plan my tasks: {userInput}. Follow the structured format exactly." } } };
var requestBody = new
{
    model = "gpt-3.5-turbo",
    messages = messages,
    max_tokens = 200
   // response_format = "json"
};

var requestContent = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
_httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

var response = await _httpClient.PostAsync("https://api.openai.com/v1/chat/completions", requestContent);
if (!response.IsSuccessStatusCode)
{
    throw new Exception($"Error from OpenAI API: {response.StatusCode}");
}

var responseBody = await response.Content.ReadAsStringAsync();
using var jsonDoc = JsonDocument.Parse(responseBody);
return jsonDoc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "{}";
*/
}


}

