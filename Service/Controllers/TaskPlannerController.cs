using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models;
using SmartTaskManager.Interfaces;

[ApiController]
[Route("api/task-planner")]
[Authorize]
public class TaskPlannerController : BaseController
{
    private readonly IPromptService _promptService;
    private readonly LLMPlanningService _llmPlanningService;
    private readonly TaskSchedulingService _taskSchedulingService;

    public TaskPlannerController(
        IPromptService promptService,
        LLMPlanningService llmPlanningService,
        TaskSchedulingService taskSchedulingService)
    {
        _promptService = promptService;
        _llmPlanningService = llmPlanningService;
        _taskSchedulingService = taskSchedulingService;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> GenerateTasks([FromBody] OpenAiRequestBody request)
    {
        if (request == null)
            return BadRequest("Request body is required.");

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var response = await _llmPlanningService.GenerateTaskAsync(request, UserId);

        var prompt = new Prompt { UserId = UserId, Text = request.UserInput, Response = response };
        await _promptService.CreatePromptAsync(prompt);

        return Ok(new { response });
    }

    [HttpPost("schedule")]
    public async Task<IActionResult> Schedule([FromBody] OpenAiRequestBody request)
    {
        if (request == null)
            return BadRequest("Request body is required.");

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(request.TimeZone))
            return BadRequest("TimeZone is required.");
        if (string.IsNullOrWhiteSpace(request.CurrentDate))
            return BadRequest("CurrentDate is required.");
        if (!DateTime.TryParse(request.CurrentDate, out _))
            return BadRequest("CurrentDate is not a valid date.");

        try
        {
            var scheduledTasks = await _taskSchedulingService.ScheduleTasksAsync(request, UserId);
            var response = System.Text.Json.JsonSerializer.Serialize(scheduledTasks);
            return Ok(new { response });
        }
        catch (TimeZoneNotFoundException)
        {
            return BadRequest(
                $"Unknown TimeZone: '{request.TimeZone}'. " +
                "Use a Windows TimeZone ID such as 'Eastern Standard Time'.");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
