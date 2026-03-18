using System.Collections.Concurrent;
using System.Text.Json;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Models.Entities;
using SmartTaskManager.Repositary;
using SmartTaskManager.Services;

/// <summary>
/// Manages bidirectional chat sessions for task management.
/// Uses gpt-4o-mini for all chat operations (16x cheaper than gpt-4o).
/// Routes task creation requests to SmartSchedulerService (keeps gpt-4o for complex scheduling).
///
/// Session storage: hybrid — hot in-memory cache (ConcurrentDictionary) + MongoDB persistence.
/// Load path: memory hit → DB load → new session.
/// Persist path: upsert to DB after every assistant response.
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
    private readonly IChatSessionRepository _chatSessionRepository;
    private readonly ILogger<ConversationalChatService> _logger;

    public ConversationalChatService(
        [FromKeyedServices("chat")] Kernel chatKernel,
        SmartSchedulerService smartSchedulerService,
        ITaskRepository taskRepository,
        IChatSessionRepository chatSessionRepository,
        ILogger<ConversationalChatService> logger)
    {
        _chatKernel = chatKernel;
        _smartSchedulerService = smartSchedulerService;
        _taskRepository = taskRepository;
        _chatSessionRepository = chatSessionRepository;
        _logger = logger;
    }

    public async Task<ChatResponse> ProcessMessageAsync(ChatRequest request, string userId)
    {
        if (!DateTime.TryParse(request.CurrentDate, out _))
            return ErrorResponse(request.SessionId, "Invalid date format.");

        try { TimeZoneInfo.FindSystemTimeZoneById(request.TimeZone); }
        catch { return ErrorResponse(request.SessionId, "Invalid timezone."); }

        CleanupExpiredSessions();

        var session = await GetOrCreateSessionAsync(request.SessionId, userId);

        // Confirmed=true: execute the pending operation without calling LLM again
        if (request.Confirmed && session.PendingOperation != null)
        {
            session.StoredMessages.Add(new StoredMessage { Role = "user", Content = "✓ Yes, proceed", Timestamp = DateTime.UtcNow });
            var confirmResult = await ExecutePendingOperationAsync(session, request.SessionId);
            await PersistSessionAsync(session, confirmResult);
            return confirmResult;
        }

        // Ensure system prompt is set once per session
        if (session.History.Count == 0)
        {
            session.History.AddSystemMessage(BuildSystemPrompt(request.CurrentDate, request.TimeZone));
        }

        // Clear any stale pending operation from a previous exchange
        session.PendingOperation = null;

        session.History.AddUserMessage(request.UserMessage);
        session.StoredMessages.Add(new StoredMessage { Role = "user", Content = request.UserMessage, Timestamp = DateTime.UtcNow });

        // Capture title from the first user message
        if (string.IsNullOrEmpty(session.Title))
        {
            var len = request.UserMessage.Length;
            session.Title = len <= 60 ? request.UserMessage : request.UserMessage[..60];
        }

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
                var message = $"I've scheduled {scheduledTasks.Count} {taskWord} for you.";

                if (scheduledTasks.Any(t => t.IsAllocatedOutsideRequestedTime))
                {
                    var notes = scheduledTasks
                        .Where(t => t.IsAllocatedOutsideRequestedTime && !string.IsNullOrEmpty(t.AllocationNote))
                        .Select(t => $"- {t.Title}: {t.AllocationNote}");
                    if (notes.Any())
                        message += "\n\nNote: " + string.Join("\n", notes);
                }

                var tasksCreatedResponse = new ChatResponse
                {
                    SessionId = request.SessionId,
                    MessageType = "tasks_created",
                    Message = message,
                    ScheduledTasks = scheduledTasks
                };
                await PersistSessionAsync(session, tasksCreatedResponse);
                return tasksCreatedResponse;
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
            var confirmationResponse = new ChatResponse
            {
                SessionId = request.SessionId,
                MessageType = "confirmation_required",
                Message = content,
                PreviewData = session.PendingOperation.PreviewData
            };
            await PersistSessionAsync(session, confirmationResponse);
            return confirmationResponse;
        }

        // Collect query results if query_tasks was called, then clear from session
        var queryResults = session.QueryResults;
        session.QueryResults = null;

        var answerResponse = new ChatResponse
        {
            SessionId = request.SessionId,
            MessageType = "answer",
            Message = content,
            QueryResults = queryResults
        };
        await PersistSessionAsync(session, answerResponse);
        return answerResponse;
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
                else count = 0;
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

    /// <summary>
    /// Cache-aside: memory → DB → new. Ownership is verified at every layer.
    /// </summary>
    private async Task<ChatSession> GetOrCreateSessionAsync(string sessionId, string userId)
    {
        // 1. Hot cache hit
        if (_sessions.TryGetValue(sessionId, out var cached))
        {
            if (cached.UserId != userId)
                throw new UnauthorizedAccessException($"Session '{sessionId}' does not belong to the current user.");
            return cached;
        }

        // 2. DB load (cache miss — server restart or new browser tab)
        var entity = await _chatSessionRepository.GetByIdAsync(sessionId);
        if (entity != null)
        {
            if (entity.UserId != userId)
                throw new UnauthorizedAccessException($"Session '{sessionId}' does not belong to the current user.");

            var session = RehydrateSession(entity);
            _sessions[sessionId] = session;
            return session;
        }

        // 3. Brand-new session
        var newSession = new ChatSession
        {
            SessionId = sessionId,
            UserId = userId,
            History = new ChatHistory(),
            LastActivity = DateTime.UtcNow
        };
        _sessions[sessionId] = newSession;
        return newSession;
    }

    /// <summary>
    /// Reconstructs an in-memory ChatSession from a persisted entity.
    /// System messages are intentionally excluded — they are re-added by ProcessMessageAsync
    /// on the first exchange after resume (BuildSystemPrompt uses the current date/timezone).
    /// </summary>
    private static ChatSession RehydrateSession(ChatSessionEntity entity)
    {
        var history = new ChatHistory();
        var nonSystem = entity.Messages
            .Where(m => m.Role != "system")
            .TakeLast(MaxHistoryMessages)
            .ToList();

        foreach (var msg in nonSystem)
        {
            if (msg.Role == "user")
                history.AddUserMessage(msg.Content);
            else
                history.AddAssistantMessage(msg.Content);
        }

        return new ChatSession
        {
            SessionId = entity.SessionId,
            UserId = entity.UserId,
            Title = entity.Title,
            History = history,
            StoredMessages = entity.Messages.ToList(),
            LastActivity = entity.LastActivity
        };
    }

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    /// <summary>
    /// Upserts the session to MongoDB. Non-fatal — a persistence failure must not break
    /// the chat response returned to the user.
    /// Appends the assistant response (with full ResponseJson) to session.StoredMessages
    /// so all prior messages retain their ResponseJson across upserts.
    /// </summary>
    private async Task PersistSessionAsync(ChatSession session, ChatResponse assistantResponse)
    {
        try
        {
            // Append the current assistant response — preserves ResponseJson on all prior messages
            session.StoredMessages.Add(new StoredMessage
            {
                Role = "assistant",
                Content = assistantResponse.Message,
                Timestamp = DateTime.UtcNow,
                ResponseJson = JsonSerializer.Serialize(assistantResponse, _jsonOptions)
            });

            var entity = new ChatSessionEntity
            {
                SessionId = session.SessionId,
                UserId = session.UserId,
                Title = session.Title,
                Messages = session.StoredMessages,
                LastActivity = session.LastActivity,
                CreatedAt = DateTime.UtcNow  // SetOnInsert in repo preserves the original value
            };

            await _chatSessionRepository.UpsertAsync(entity);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist chat session {SessionId}", session.SessionId);
        }
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
        // Pre-compute concrete date anchors so gpt-4o-mini doesn't have to reason about them
        DateTime.TryParse(currentDate, out var today);
        today = today.Date;

        var yesterday  = today.AddDays(-1);
        var tomorrow   = today.AddDays(1);

        // Monday-based week
        int daysFromMonday = ((int)today.DayOfWeek + 6) % 7;
        var thisWeekStart  = today.AddDays(-daysFromMonday);
        var thisWeekEnd    = thisWeekStart.AddDays(6);
        var nextWeekStart  = thisWeekStart.AddDays(7);
        var nextWeekEnd    = nextWeekStart.AddDays(6);
        var lastWeekStart  = thisWeekStart.AddDays(-7);
        var lastWeekEnd    = thisWeekStart.AddDays(-1);

        var thisMonthStart = new DateTime(today.Year, today.Month, 1);
        var thisMonthEnd   = thisMonthStart.AddMonths(1).AddDays(-1);
        var lastMonthStart = thisMonthStart.AddMonths(-1);
        var lastMonthEnd   = thisMonthStart.AddDays(-1);
        var nextMonthStart = thisMonthStart.AddMonths(1);
        var nextMonthEnd   = nextMonthStart.AddMonths(1).AddDays(-1);

        // Next occurrence of each weekday (always forward from today)
        static string NextWeekday(DateTime from, DayOfWeek dow)
        {
            var d = from.AddDays(1);
            while (d.DayOfWeek != dow) d = d.AddDays(1);
            return d.ToString("yyyy-MM-dd");
        }

        var F = "yyyy-MM-dd";
        return $"""
            You are a task management assistant for the Smart Task Manager app.
            Today's local date: {today.ToString(F)}. User's timezone: {timeZone}.

            You have access to these functions:
            - query_tasks: answer questions about tasks
            - bulk_reschedule_preview: preview moving tasks between date ranges (ALWAYS call before rescheduling)
            - bulk_status_update_preview: preview changing task statuses in bulk (ALWAYS call before updating)
            - bulk_delete_preview: preview deleting tasks (ALWAYS call before deleting)
            - get_task_summary: get task count statistics

            ── DATE RESOLUTION (resolve BEFORE calling any function) ──────────────────
            All dates you pass to functions must be in LOCAL time, format: yyyy-MM-ddTHH:mm:ss (no Z).
            Use these pre-computed values — do NOT re-derive them:

              yesterday       = {yesterday.ToString(F)}   → {yesterday.ToString(F)}T00:00:00 … {yesterday.ToString(F)}T23:59:59
              today           = {today.ToString(F)}        → {today.ToString(F)}T00:00:00 … {today.ToString(F)}T23:59:59
              tomorrow        = {tomorrow.ToString(F)}   → {tomorrow.ToString(F)}T00:00:00 … {tomorrow.ToString(F)}T23:59:59
              this week       = {thisWeekStart.ToString(F)} – {thisWeekEnd.ToString(F)}
              next week       = {nextWeekStart.ToString(F)} – {nextWeekEnd.ToString(F)}
              last week       = {lastWeekStart.ToString(F)} – {lastWeekEnd.ToString(F)}
              this month      = {thisMonthStart.ToString(F)} – {thisMonthEnd.ToString(F)}
              next month      = {nextMonthStart.ToString(F)} – {nextMonthEnd.ToString(F)}
              last month      = {lastMonthStart.ToString(F)} – {lastMonthEnd.ToString(F)}

            Weekday look-up (next occurrence AFTER today, never today itself):
              next Monday     = {NextWeekday(today, DayOfWeek.Monday)}
              next Tuesday    = {NextWeekday(today, DayOfWeek.Tuesday)}
              next Wednesday  = {NextWeekday(today, DayOfWeek.Wednesday)}
              next Thursday   = {NextWeekday(today, DayOfWeek.Thursday)}
              next Friday     = {NextWeekday(today, DayOfWeek.Friday)}
              next Saturday   = {NextWeekday(today, DayOfWeek.Saturday)}
              next Sunday     = {NextWeekday(today, DayOfWeek.Sunday)}

            When a user says a bare day name (e.g. "Sunday", "Friday") with no qualifier:
              → treat it as "next <day>" from the table above.
            When a user says a bare month name (e.g. "March", "April"):
              → use the full month range for that month in the current or next year as appropriate.
            ──────────────────────────────────────────────────────────────────────────

            ── INTENT RULES ──────────────────────────────────────────────────────────
            1. ALWAYS call a *_preview function and show results BEFORE any write operation.
            2. After showing a preview, tell the user to click "Yes, proceed" to confirm.

            3. TASK CREATION — respond with exactly "INTENT:CREATE_TASK" (nothing else) when the user
               is describing work to be done, e.g.:
                 "work on X", "fix X", "do X", "build X", "write X", "call X", "review X",
                 "schedule X", "add a task for X", "create X", "remind me to X", "book time for X".
               Key rule: if the SUBJECT is a task/activity the user wants to do or create,
               it is CREATE_TASK — even if the sentence contains words like "open", "status",
               or "not started". Those are task properties, NOT commands to update existing tasks.

            4. BULK OPERATIONS — only call preview functions when the user explicitly asks to
               MODIFY or DELETE existing tasks already in the system, e.g.:
                 "move all tasks from Monday to Tuesday",
                 "mark everything this week as completed",
                 "delete all blocked tasks".
               Do NOT trigger a bulk operation from a sentence that describes a new task.

            5. Keep responses concise — this is a mobile-friendly app.
            ──────────────────────────────────────────────────────────────────────────
            """;
    }
}
