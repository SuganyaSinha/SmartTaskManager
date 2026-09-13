// TODO: this controller is no longer used and can be deleted.
using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Interfaces;
using Microsoft.AspNetCore.Authorization;
using SmartTaskManager.Models;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PromptController : BaseController
{
    private readonly IPromptService _promptService;

    public PromptController(IPromptService promptService)
    {
        _promptService = promptService;
    }

    [HttpGet]
    public async Task<ActionResult<List<Prompt>>> GetPromptsByUser()
    {
        var prompts = await _promptService.GetPromptsByUserAsync(UserId);
        return Ok(prompts);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Prompt>> GetPromptById(string id)
    {
        var prompt = await _promptService.GetPromptByIdAsync(id);
        if (prompt == null || prompt.UserId != UserId)
            return NotFound();

        return Ok(prompt);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePrompt([FromBody] Prompt prompt)
    {
        prompt.UserId = UserId;
        await _promptService.CreatePromptAsync(prompt);
        return CreatedAtAction(nameof(GetPromptById), new { id = prompt.Id }, prompt);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePrompt(string id)
    {
        var prompt = await _promptService.GetPromptByIdAsync(id);
        if (prompt == null || prompt.UserId != UserId)
            return NotFound();

        var deleted = await _promptService.DeletePromptAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
