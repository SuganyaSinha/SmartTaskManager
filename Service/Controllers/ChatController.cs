using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;

[ApiController]
[Route("api/chat")]
[Authorize]
public class ChatController : BaseController
{
    private readonly ConversationalChatService _chatService;
    private readonly IChatSessionRepository _chatSessionRepository;
    private readonly ILogger<ChatController> _logger;

    public ChatController(
        ConversationalChatService chatService,
        IChatSessionRepository chatSessionRepository,
        ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _chatSessionRepository = chatSessionRepository;
        _logger = logger;
    }

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
        catch (TimeZoneNotFoundException ex)
        {
            _logger.LogWarning(ex, "Unknown TimeZone: '{TimeZone}'", request.TimeZone);
            return BadRequest($"Unknown TimeZone: '{request.TimeZone}'. Use a Windows TimeZone ID such as 'Eastern Standard Time'.");
        }
        catch (UnauthorizedAccessException ex)
        {
            _logger.LogWarning(ex, "Unauthorized chat attempt for session {SessionId}", request.SessionId);
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid argument in chat request for session {SessionId}", request.SessionId);
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        try
        {
            var entities = await _chatSessionRepository.GetByUserIdAsync(UserId);

            var summaries = entities.Select(e => new ChatSessionSummary
            {
                SessionId = e.SessionId,
                Title = string.IsNullOrWhiteSpace(e.Title) ? "New Chat" : e.Title,
                LastActivity = e.LastActivity,
                MessageCount = e.Messages.Count(m => m.Role != "system")
            }).ToList();

            return Ok(summaries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve sessions for user {UserId}", UserId);
            return StatusCode(500, "Failed to retrieve sessions.");
        }
    }

    [HttpDelete("sessions/{sessionId}")]
    public async Task<IActionResult> DeleteSession(string sessionId)
    {
        try
        {
            var entity = await _chatSessionRepository.GetByIdAsync(sessionId);
            if (entity == null) return NotFound();
            if (entity.UserId != UserId) return Forbid();

            await _chatSessionRepository.DeleteAsync(sessionId, UserId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete session {SessionId} for user {UserId}", sessionId, UserId);
            return StatusCode(500, "Failed to delete session.");
        }
    }

    [HttpGet("sessions/{sessionId}/messages")]
    public async Task<IActionResult> GetSessionMessages(string sessionId)
    {
        var entity = await _chatSessionRepository.GetByIdAsync(sessionId);
        if (entity == null) return NotFound();
        if (entity.UserId != UserId) return Forbid();

        try
        {
            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                PropertyNameCaseInsensitive = true
            };

            var dtos = new List<SessionMessageDto>();
            foreach (var m in entity.Messages.TakeLast(24))
            {
                if (m.Role == "user")
                {
                    dtos.Add(new SessionMessageDto
                    {
                        Role = "user",
                        Message = m.Content,
                        MessageType = "user_message"
                    });
                }
                else if (!string.IsNullOrEmpty(m.ResponseJson))
                {
                    var dto = JsonSerializer.Deserialize<SessionMessageDto>(m.ResponseJson, jsonOptions);
                    if (dto != null)
                    {
                        dto.Role = "assistant";
                        dtos.Add(dto);
                    }
                }
                else
                {
                    // Backward compat: old messages without ResponseJson
                    dtos.Add(new SessionMessageDto
                    {
                        Role = "assistant",
                        Message = m.Content,
                        MessageType = "answer"
                    });
                }
            }

            return Ok(dtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process messages for session {SessionId}", sessionId);
            throw;
        }
    }
}
