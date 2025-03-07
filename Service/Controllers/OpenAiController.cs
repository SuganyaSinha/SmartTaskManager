using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;

[ApiController]
[Route("api/openai")]
public class OpenAiController : ControllerBase
{
    private readonly OpenAiService _openAiService;

    public OpenAiController(OpenAiService openAiService)
    {
        _openAiService = openAiService;
    }

    [Authorize]
    [HttpPost("ask")]
    public async Task<IActionResult> AskOpenAi([FromBody] string request)
    {
        if (string.IsNullOrWhiteSpace(request))
        {
            return BadRequest("Prompt cannot be empty.");
        }

        //var response = await _openAiService.GetResponseAsync(AppendToThePrompt(request.Prompt));
        var response = await _openAiService.GetResponseAsync(request);
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
