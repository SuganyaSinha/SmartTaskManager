using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Interfaces;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using SmartTaskManager.Models;

[ApiController]
[Route("api/[controller]")]
public class PromptController : ControllerBase
{
    private readonly IPromptService _promptService;

    public PromptController(IPromptService promptService)
    {
        _promptService = promptService;
    }

    [Authorize]
    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<Prompt>>> GetPromptsByUser(string userId)
    {
        var prompts = await _promptService.GetPromptsByUserAsync(userId);
        return Ok(prompts);
    }

    [Authorize]
    [HttpGet("{id}")]
    public async Task<ActionResult<Prompt>> GetPromptById(string id)
    {
        var prompt = await _promptService.GetPromptByIdAsync(id);
        if (prompt == null) return NotFound();
        return Ok(prompt);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> CreatePrompt([FromBody] Prompt prompt)
    {
        await _promptService.CreatePromptAsync(prompt);
        return CreatedAtAction(nameof(GetPromptById), new { id = prompt.Id }, prompt);
    }

    [Authorize]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePrompt(string id)
    {
        var deleted = await _promptService.DeletePromptAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
