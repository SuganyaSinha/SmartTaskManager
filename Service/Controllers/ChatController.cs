using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models.DTO;

[ApiController]
[Route("api/chat")]
public class ChatController : BaseController
{
    private readonly ConversationalChatService _chatService;

    public ChatController(ConversationalChatService chatService)
    {
        _chatService = chatService;
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Chat([FromBody] ChatRequest request)
    {
        if (request == null)
            return BadRequest("Request body is required.");

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(request.TimeZone))
            return BadRequest("TimeZone is required.");

        if (string.IsNullOrWhiteSpace(request.CurrentDate))
            return BadRequest("CurrentDate is required.");

        if (string.IsNullOrWhiteSpace(request.SessionId))
            request.SessionId = Guid.NewGuid().ToString();

        try
        {
            var response = await _chatService.ProcessMessageAsync(request, UserId);
            return Ok(response);
        }
        catch (TimeZoneNotFoundException)
        {
            return BadRequest($"Unknown TimeZone: '{request.TimeZone}'. Use a Windows TimeZone ID such as 'Eastern Standard Time'.");
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
