using System.Collections.Concurrent;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;
using SmartTaskManager.Services;

/// <summary>
/// Manages bidirectional chat sessions for task management.
/// Uses gpt-4o-mini for all chat operations (16x cheaper than gpt-4o).
/// Routes task creation requests to SmartSchedulerService (keeps gpt-4o for complex scheduling).
///
/// Confirmation pattern:
///   1. User asks a bulk operation → TaskPlugin preview function called → session.PendingOperation set
///   2. Response returned with type=confirmation_required + preview data
///   3. User clicks "Yes" → same request with confirmed=true
///   4. ConversationalChatService executes directly (no second LLM call)
/// </summary>
public class ConversationalChatService
{
    private static readonly ConcurrentDictionary<string, ChatSession> _sessions = new();
    private static readonly TimeSpan SessionTtl = TimeSpan.FromMinutes(15);
    private const int MaxHistoryMessages = 12; // ~6 turns

    private readonly Kernel _chatKernel;
    private readonly SmartSchedulerService _smartSchedulerService;
    private readonly ITaskRepository _taskRepository;
    private readonly ILogger<ConversationalChatService> _logger;

    public ConversationalChatService(
        [FromKeyedServices("chat")] Kernel chatKernel,
        SmartSchedulerService smartSchedulerService,
        ITaskRepository taskRepository,
        ILogger<ConversationalChatService> logger)
    {
        _chatKernel = chatKernel;
        _smartSchedulerService = smartSchedulerService;
        _taskRepository = taskRepository;
        _logger = logger;
    }

    public async Task<ChatResponse> ProcessMessageAsync(ChatRequest request, string userId)
    {
        CleanupExpiredSessions();

        var session = GetOrCreateSession(request.SessionId, userId);

        // Confirmed=true: execute the pending operation without calling LLM again
        if (request.Confirmed && session.PendingOperation != null)
        {
            return await ExecutePendingOperationAsync(session, request.SessionId);
        }

        // Ensure system prompt is set once per session
        if (session.History.Count == 0)
        {
            session.History.AddSystemMessage(BuildSystemPrompt(request.CurrentDate, request.TimeZone));
        }

        // Clear any stale pending operation from a previous exchange
        session.PendingOperation = null;

        session.History.AddUserMessage(request.UserMessage);

        // Create a kernel clone with TaskPlugin registered for this user's session
        var kernelClone = _chatKernel.Clone();
        var taskPlugin = new TaskPlugin(_taskRepository, userId, session, request.TimeZone);
        kernelClone.Plugins.AddFromObject(taskPlugin, "Tasks");

        var chatService = kernelClone.GetRequiredService<IChatCompletionService>();

        ChatMessageContent response;
        try
        {
            response = await chatService.GetChatMessageContentAsync(
                session.History,
                new OpenAIPromptExecutionSettings
                {
                    FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(),
                    MaxTokens = 600
                },
                kernelClone);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "LLM call failed for session {SessionId}", request.SessionId);
            return ErrorResponse(request.SessionId, "I encountered an error. Please try again.");
        }

        var content = response.Content ?? string.Empty;
        session.History.Add(response);
        session.LastActivity = DateTime.UtcNow;
        TrimHistory(session.History);

        // Task creation signal from LLM
        if (content.Contains("INTENT:CREATE_TASK"))
        {
            try
            {
                var openAiRequest = new OpenAiRequestBody
                {
                    UserInput = request.UserMessage,
                    CurrentDate = request.CurrentDate,
                    TimeZone = request.TimeZone
                };

                var scheduledTasks = await _smartSchedulerService.ScheduleTasksAsync(openAiRequest, userId);
                var taskWord = scheduledTasks.Count == 1 ? "task" : "tasks";
                var message = $"I've scheduled {scheduledTasks.Count} {taskWord} for you. Check the calendar!";

                if (scheduledTasks.Any(t => t.IsAllocatedOutsideRequestedTime))
                {
                    var notes = scheduledTasks
                        .Where(t => t.IsAllocatedOutsideRequestedTime && !string.IsNullOrEmpty(t.AllocationNote))
                        .Select(t => $"- {t.Title}: {t.AllocationNote}");
                    if (notes.Any())
                        message += "\n\nNote: " + string.Join("\n", notes);
                }

                return new ChatResponse
                {
                    SessionId = request.SessionId,
                    MessageType = "tasks_created",
                    Message = message,
                    ScheduledTasks = scheduledTasks
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SmartScheduler failed for session {SessionId}", request.SessionId);
                return ErrorResponse(request.SessionId, "I couldn't schedule the tasks. Please try rephrasing.");
            }
        }

        // A preview function was called → require confirmation
        if (session.PendingOperation != null)
        {
            return new ChatResponse
            {
                SessionId = request.SessionId,
                MessageType = "confirmation_required",
                Message = content,
                PreviewData = session.PendingOperation.PreviewData
            };
        }

        // Collect query results if query_tasks was called, then clear from session
        var queryResults = session.QueryResults;
        session.QueryResults = null;

        return new ChatResponse
        {
            SessionId = request.SessionId,
            MessageType = "answer",
            Message = content,
            QueryResults = queryResults
        };
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private async Task<ChatResponse> ExecutePendingOperationAsync(ChatSession session, string sessionId)
    {
        var op = session.PendingOperation!;
        session.PendingOperation = null;

        try
        {
            int count;
            if (op.TaskIds is { Count: > 0 })
            {
                // Execute on specific task IDs from a prior query result
                count = 0;
                if (op.OperationType == "reschedule")
                {
                    var offset = op.RescheduleOffset ?? throw new InvalidOperationException("RescheduleOffset missing");
                    foreach (var taskId in op.TaskIds)
                    {
                        var task = await _taskRepository.GetTaskByIdAsync(taskId);
                        if (task == null || task.UserId != session.UserId) continue;
                        if (task.Start.HasValue) task.Start = task.Start.Value + offset;
                        if (task.End.HasValue) task.End = task.End.Value + offset;
                        await _taskRepository.UpdateTaskAsync(taskId, session.UserId, task);
                        count++;
                    }
                }
                else if (op.OperationType == "status_update")
                {
                    if (!Enum.TryParse<SmartTaskManager.Models.DTO.TaskStatus>(op.NewStatus, out var newTaskStatus))
                        throw new ArgumentException($"Invalid status: {op.NewStatus}");

                    foreach (var taskId in op.TaskIds)
                    {
                        var task = await _taskRepository.GetTaskByIdAsync(taskId);
                        if (task == null || task.UserId != session.UserId) continue;
                        task.Status = newTaskStatus;
                        await _taskRepository.UpdateTaskAsync(taskId, session.UserId, task);
                        count++;
                    }
                }
                else if (op.OperationType == "delete")
                {
                    foreach (var taskId in op.TaskIds)
                    {
                        var deleted = await _taskRepository.DeleteTaskAsync(taskId, session.UserId);
                        if (deleted) count++;
                    }
                }
            }
            else
            {
                count = op.OperationType switch
                {
                    "reschedule" => await _taskRepository.BulkRescheduleAsync(
                        session.UserId,
                        op.SourceStart!.Value,
                        op.SourceEnd!.Value,
                        op.TargetStart!.Value,
                        op.Status ?? "All"),

                    "status_update" => await _taskRepository.BulkUpdateStatusAsync(
                        session.UserId,
                        op.StartDate,
                        op.EndDate,
                        op.CurrentStatus ?? "All",
                        op.NewStatus!),

                    "delete" => await _taskRepository.BulkDeleteAsync(
                        session.UserId,
                        op.StartDate,
                        op.EndDate,
                        op.Status ?? "All"),

                    _ => throw new InvalidOperationException($"Unknown operation: {op.OperationType}")
                };
            }

            var message = op.OperationType switch
            {
                "reschedule" => $"Done! Moved {count} task(s) to the new date range.",
                "status_update" => $"Done! Updated {count} task(s) to '{op.NewStatus}'.",
                "delete" => $"Done! Deleted {count} task(s).",
                _ => $"Operation completed: {count} task(s) affected."
            };

            session.History.AddAssistantMessage(message);
            session.LastActivity = DateTime.UtcNow;

            return new ChatResponse
            {
                SessionId = sessionId,
                MessageType = "operation_complete",
                Message = message
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Execute operation failed for session {SessionId}", sessionId);
            return ErrorResponse(sessionId, "The operation failed. Please try again.");
        }
    }

    private ChatSession GetOrCreateSession(string sessionId, string userId)
    {
        return _sessions.GetOrAdd(sessionId, id => new ChatSession
        {
            SessionId = id,
            UserId = userId,
            History = new ChatHistory(),
            LastActivity = DateTime.UtcNow
        });
    }

    private static void TrimHistory(ChatHistory history)
    {
        // Keep system message (index 0) + last MaxHistoryMessages non-system messages
        var systemMessages = history.Where(m => m.Role == AuthorRole.System).ToList();
        var otherMessages = history.Where(m => m.Role != AuthorRole.System).ToList();

        if (otherMessages.Count <= MaxHistoryMessages) return;

        var trimmed = otherMessages.TakeLast(MaxHistoryMessages).ToList();
        history.Clear();
        foreach (var m in systemMessages) history.Add(m);
        foreach (var m in trimmed) history.Add(m);
    }

    private static void CleanupExpiredSessions()
    {
        var expired = _sessions
            .Where(kvp => DateTime.UtcNow - kvp.Value.LastActivity > SessionTtl)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var key in expired)
            _sessions.TryRemove(key, out _);
    }

    private static ChatResponse ErrorResponse(string sessionId, string message) => new()
    {
        SessionId = sessionId,
        MessageType = "error",
        Message = message
    };

    private static string BuildSystemPrompt(string currentDate, string timeZone)
    {
        return $"""
            You are a task management assistant for the Smart Task Manager app.
            Current local date/time: {currentDate}. User's timezone: {timeZone}.

            You have access to these functions:
            - query_tasks: answer questions about tasks
            - bulk_reschedule_preview: preview moving tasks between date ranges (ALWAYS call before rescheduling)
            - bulk_status_update_preview: preview changing task statuses in bulk (ALWAYS call before updating)
            - bulk_delete_preview: preview deleting tasks (ALWAYS call before deleting)
            - get_task_summary: get task count statistics

            IMPORTANT — Dates and times:
            - All date/time arguments you pass to functions MUST be in the user's LOCAL timezone ({timeZone}).
            - Format: yyyy-MM-ddTHH:mm:ss  (no Z, no UTC offset — local time only).
            - Example: if user says "last month" and today is 2026-03-10, pass sourceStart=2026-02-01T00:00:00 and sourceEnd=2026-02-28T23:59:59.
            - Resolve relative expressions ("last month", "this week", "yesterday") from the current local date above.

            Rules:
            1. ALWAYS call a *_preview function and show the results to the user before any write operation.
            2. After showing a preview, tell the user to click "Yes, proceed" to confirm.
            3. If the user's request sounds like creating NEW tasks (e.g. "schedule yoga", "add a meeting", "remind me to", "book a time for"), respond with exactly: INTENT:CREATE_TASK
            4. Keep responses concise — this is a mobile-friendly app.
            """;
    }
}
