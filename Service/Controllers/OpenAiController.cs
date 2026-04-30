using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models;
using SmartTaskManager.Interfaces;

[ApiController]
[Route("api/openai")]
[Authorize]
public class OpenAiController : BaseController
{
    private readonly IPromptService _promptService;
    private readonly AIPlannerService _aiPlannerService;
    private readonly SmartSchedulerService _smartSchedulerService;

    public OpenAiController(
        IPromptService promptService,
        AIPlannerService aiPlannerService,
        SmartSchedulerService smartSchedulerService)
    {
        _promptService = promptService;
        _aiPlannerService = aiPlannerService;
        _smartSchedulerService = smartSchedulerService;
    }

    [HttpPost("ask")]
    public async Task<IActionResult> AskOpenAi([FromBody] OpenAiRequestBody request)
    {
        if (request == null)
            return BadRequest("Request body is required.");

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var response = await _aiPlannerService.GenerateTaskAsync(request, UserId);

        var prompt = new Prompt { UserId = UserId, Text = request.UserInput, Response = response };
        await _promptService.CreatePromptAsync(prompt);

        return Ok(new { response });
    }

    [HttpPost("smart-schedule")]
    public async Task<IActionResult> SmartSchedule([FromBody] OpenAiRequestBody request)
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
            var scheduledTasks = await _smartSchedulerService.ScheduleTasksAsync(request, UserId);
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
