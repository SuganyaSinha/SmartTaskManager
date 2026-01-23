using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Services;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using SmartTaskManager.Models;
using SmartTaskManager.Interfaces;

[ApiController]
[Route("api/openai")]
public class OpenAiController : ControllerBase
{
    private readonly OpenAiService _openAiService;
    private readonly IPromptService _promptService;

    private readonly AIPlannerService _aiPlannerService;

    private string GetUserId()
    {
        var userId = User.FindFirst("sub")?.Value;
        if(string.IsNullOrEmpty(userId))
            throw new Exception("Could not get the User Id from the token");
        else
            return userId;
    }

    public OpenAiController( OpenAiService openAiService,
                            IPromptService promptService,
                            AIPlannerService aiPlannerService)
    {
        _openAiService = openAiService;
        _promptService = promptService;
        _aiPlannerService = aiPlannerService;
    }

    [Authorize]
    [HttpPost("ask")]
    public async Task<IActionResult> AskOpenAi([FromBody] OpenAiRequestBody request)
    {
        if (string.IsNullOrWhiteSpace(request.UserInput))
        {
            return BadRequest("Prompt cannot be empty.");
        }
        //var response = await _openAiService.GetResponseAsync(request, GetUserId());
        var response = await _aiPlannerService.GenerateTaskAsync(request, GetUserId());

        var sub = User.FindFirst("sub")?.Value;
        if(sub != null)
        {
            var prompt = new Prompt{UserId = sub, Text = request.UserInput, Response = response};
            await _promptService.CreatePromptAsync(prompt);
        }
        

        return Ok(new { response });
    }

    private string AppendToThePrompt(string input)
    {
        StringBuilder sb = new StringBuilder();
        sb.Append(input);
        sb.Append("Give the response as json.If the there are many tasks in a day which can not be completed normally without working very hard, add a flag named overloaded and set it to true for that day.");
        sb.Append("Specify whether tasks are generated for a single day/for entire week. If it is for entire week, specify tasks for each day of the week");

        return sb.ToString();

    }
}



public class OpenAiRequest
{
    public required string Prompt { get; set; }
}
