using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;

public class OpenAiService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    private List<Dictionary<string, string>> _conversationHistory = new();

    public OpenAiService(IHttpClientFactory httpClientFactory, IOptions<OpenAiConfig> config)
    {
        _httpClient = httpClientFactory.CreateClient();
        _apiKey = config.Value.ApiKey;
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
    }

    public async Task<string> GetResponseAsync(string userInput)
    {
        
        _conversationHistory.Add(new Dictionary<string, string> { { "role", "user" }, { "content", userInput } });

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

