using System.Text.Json;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI;
using SmartTaskManager.Models;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;

/// <summary>
///
/// Two-phase pipeline:
///   Phase 1 - Intent extraction
///   Phase 2 - Deterministic C# scheduling (conflict detection, slot-finding, recurrence)
///
/// </summary>
public class TaskSchedulingService
{
    // ─── Constants ───────────────────────────────────────────────────────────
    private const int MaxDailyMinutes    = 480;  // 8 hours
    private const int BreakMinutes       = 15;   // mandatory gap between tasks
    private const int MaxRecurrenceCount = 60;   // hard cap on recurring instances
    private const int MaxSearchDays      = 60;   // lookahead window for slot-finding

    private static readonly TimeSpan FallbackWindowStart = TimeSpan.FromHours(8);
    private static readonly TimeSpan FallbackWindowEnd   = TimeSpan.FromHours(20);

    // Mapping from ProductiveHours enum to concrete time windows
    private static readonly Dictionary<ProductiveHours, (TimeSpan Start, TimeSpan End)> ProdHourWindows =
        new()
        {
            [ProductiveHours.EarlyMorning] = (TimeSpan.FromHours(5),  TimeSpan.FromHours(8)),
            [ProductiveHours.Morning]      = (TimeSpan.FromHours(8),  TimeSpan.FromHours(10)),
            [ProductiveHours.LateMorning]  = (TimeSpan.FromHours(10), TimeSpan.FromHours(12)),
            [ProductiveHours.Afternoon]    = (TimeSpan.FromHours(13), TimeSpan.FromHours(17)),
            [ProductiveHours.Evening]      = (TimeSpan.FromHours(17), TimeSpan.FromHours(20)),
            [ProductiveHours.Night]        = (TimeSpan.FromHours(20), TimeSpan.FromHours(23)),
        };

    // ─── Dependencies ────────────────────────────────────────────────────────
    private readonly Kernel _grokKernel;
    private readonly ITaskRepository _taskRepository;
    private readonly IUserRoutineRepositary _userRoutineRepository;
    private readonly ILogger<TaskSchedulingService> _logger;

    public TaskSchedulingService(
        [FromKeyedServices("grok-scheduler")] Kernel grokKernel,
        ITaskRepository taskRepository,
        IUserRoutineRepositary userRoutineRepository,
        ILogger<TaskSchedulingService> logger)
    {
        _grokKernel            = grokKernel           ?? throw new ArgumentNullException(nameof(grokKernel));
        _taskRepository        = taskRepository       ?? throw new ArgumentNullException(nameof(taskRepository));
        _userRoutineRepository = userRoutineRepository ?? throw new ArgumentNullException(nameof(userRoutineRepository));
        _logger                = logger               ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<List<ScheduledTaskResult>> ScheduleTasksAsync(
        OpenAiRequestBody input,
        string userId)
    {
        try
        {
            if (input == null)
                throw new ArgumentNullException(nameof(input));
            if (string.IsNullOrWhiteSpace(userId))
                throw new ArgumentException("UserId is required.", nameof(userId));
            if (string.IsNullOrWhiteSpace(input.UserInput))
                throw new ArgumentException("UserInput cannot be empty.");

            // Throws TimeZoneNotFoundException for unknown IDs (caught by controller)
            TimeZoneInfo tz = TimeZoneInfo.FindSystemTimeZoneById(input.TimeZone);

            if (!DateTime.TryParse(input.CurrentDate, out DateTime currentLocalTime))
                throw new ArgumentException(
                    $"Invalid CurrentDate format: '{input.CurrentDate}'. Expected yyyy-MM-ddTHH:mm");
            currentLocalTime = DateTime.SpecifyKind(currentLocalTime, DateTimeKind.Unspecified);

            // ── Step 1: Parse intent ─────────────────────────────
            List<ParsedTaskRequest> parsedTasks =
                await ExtractIntentAsync(input.UserInput, input.CurrentDate);

            if (parsedTasks == null || parsedTasks.Count == 0)
                return new List<ScheduledTaskResult>();

            // ── Step 2: Load existing schedule and user routine ──────────────
            var (allBlocks, usedMinutesPerDay) = await LoadExistingBlocksAsync(userId, tz);
            RoutineProfile? routine = await _userRoutineRepository.GetUserRoutineAsync(userId);

            // ── Step 3: Schedule deterministically ──────────────────────────
            // High-priority tasks get first pick of available slots.
            var prioritized = parsedTasks.OrderBy(PriorityOrder).ToList();
            var results     = new List<ScheduledTaskResult>();

            foreach (var parsed in prioritized)
            {
                int duration = Math.Max(parsed.DurationMinutes, 1);

                if (parsed.IsRecurring && parsed.RecurrenceType != "none")
                {
                    var recurring = ScheduleRecurring(
                        parsed, duration, currentLocalTime, routine, allBlocks, usedMinutesPerDay);
                    results.AddRange(recurring);
                }
                else
                {
                    var single = ScheduleSingle(
                        parsed, duration, currentLocalTime, routine, allBlocks, usedMinutesPerDay);
                    if (single != null)
                        results.Add(single);
                }
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling tasks for user {UserId}", userId);
            throw;
        }
    }

    private async Task<List<ParsedTaskRequest>> ExtractIntentAsync(
        string userInput, string currentDate)
    {
        var chatService = _grokKernel.GetRequiredService<IChatCompletionService>();
        var history     = new ChatHistory();
        history.AddSystemMessage(BuildIntentPrompt(currentDate));
        history.AddUserMessage(userInput);

        var response = await chatService.GetChatMessageContentAsync(
            history,
            new OpenAIPromptExecutionSettings { MaxTokens = 700 },
            _grokKernel);

        string raw = StripMarkdownFences(response.Content ?? string.Empty).Trim();

        try
        {
            var parsed = JsonSerializer.Deserialize<List<ParsedTaskRequest>>(
                raw,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return parsed ?? new List<ParsedTaskRequest>();
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Intent JSON parse failed. Raw response: {Raw}", raw);
            return new List<ParsedTaskRequest>();
        }
    }

    private static string BuildIntentPrompt(string currentDate)
    {
        return
            "You are a task intent parser. Your ONLY job is to extract structured task data from the user's message.\n" +
            $"Current date/time (user local time): {currentDate}\n\n" +
            "IMPORTANT: The user may enter any kind of task — including software development work items such as " +
            "\"fix the errors\", \"add filtering based on task priority\", \"unauthenticated user view\", " +
            "\"write unit tests\", \"refactor login flow\", etc. These are valid tasks. Always create a task entry for them.\n\n" +
            "Return a compact JSON array. Each element must have EXACTLY these fields:\n" +
            "- \"title\": string (use the user's input as-is if it is a plain task name; clean up grammar only if needed)\n" +
            "- \"durationMinutes\": integer (default 60 if unspecified)\n" +
            "- \"priority\": \"high\" | \"medium\" | \"low\" (default \"medium\")\n" +
            "- \"taskCategory\": \"work\" | \"personal\" (classify based on context: personal for health, family, hobbies, leisure; work for meetings, coding, reviews, bug fixes, features, reports; default \"work\")\n" +
            "- \"requestedDate\": \"YYYY-MM-DD\" or null (resolve relative dates to concrete dates; use null if no date is mentioned)\n" +
            "- \"requestedTime\": \"HH:mm\" 24h or null (use null if no time is mentioned)\n" +
            "- \"isRecurring\": boolean\n" +
            "- \"recurrenceType\": \"none\" | \"daily\" | \"weekly\" | \"monthly\"\n" +
            "- \"recurrenceCount\": integer (1 for non-recurring; reasonable number for recurring like 7 for daily-for-a-week)\n" +
            "- \"comments\": string (a concise 1-sentence description of what this task involves; may differ from the user's exact wording)\n\n" +
            "Rules:\n" +
            $"- Resolve relative dates (\"tomorrow\", \"next Friday\", \"March 5th\") relative to {currentDate}.\n" +
            "- Validate calendar dates: never produce a date that does not exist (e.g. Feb 29 only exists in leap years; 2026 is NOT a leap year; always verify month/day combinations are valid).\n" +
            "- If the input is a plain task description with no date or time, still create a task with requestedDate: null and requestedTime: null.\n" +
            "- Never return an empty array. Any user input that describes a task or work item must produce at least one entry.\n" +
            "- Do NOT make scheduling decisions. Do NOT check conflicts. Only extract intent.\n" +
            "- Return ONLY a raw JSON array. No markdown, no explanations.";
    }

    private async Task<(List<TimeBlock> blocks, Dictionary<DateTime, int> usedMinutes)>
        LoadExistingBlocksAsync(string userId, TimeZoneInfo tz)
    {
        var nowUtc   = DateTime.UtcNow;
        var startUtc = nowUtc.AddDays(-5);
        var endUtc   = nowUtc.AddDays(MaxSearchDays + 5);

        var notStartedFilter = new TaskFilterRequest
        {
            Status = SmartTaskManager.Models.DTO.TaskStatus.NotStarted,
            Start  = startUtc,
            End    = endUtc
        };
        var inProgressFilter = new TaskFilterRequest
        {
            Status = SmartTaskManager.Models.DTO.TaskStatus.InProgress,
            Start  = startUtc,
            End    = endUtc
        };

        var notStarted = await _taskRepository.GetTasksAsync(userId, notStartedFilter);
        var inProgress = await _taskRepository.GetTasksAsync(userId, inProgressFilter);

        var blocks      = new List<TimeBlock>();
        var usedMinutes = new Dictionary<DateTime, int>();

        foreach (var task in notStarted.Concat(inProgress)
                                       .Where(t => t.Start.HasValue && t.End.HasValue))
        {
            var localStart = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.SpecifyKind(task.Start!.Value, DateTimeKind.Utc), tz);
            var localEnd = TimeZoneInfo.ConvertTimeFromUtc(
                DateTime.SpecifyKind(task.End!.Value, DateTimeKind.Utc), tz);

            blocks.Add(new TimeBlock { Start = localStart, End = localEnd });

            var day      = localStart.Date;
            int duration = (int)Math.Round((localEnd - localStart).TotalMinutes);
            if (!usedMinutes.ContainsKey(day)) usedMinutes[day] = 0;
            usedMinutes[day] += Math.Max(duration, 0);
        }

        return (blocks, usedMinutes);
    }

    private ScheduledTaskResult? ScheduleSingle(
        ParsedTaskRequest parsed,
        int durationMinutes,
        DateTime currentLocalTime,
        RoutineProfile? routine,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay)
    {
        string taskCategory    = (parsed.TaskCategory ?? "work").ToLower();
        bool   isPersonal      = taskCategory == "personal";
        bool   userSpecifiedTime = !string.IsNullOrWhiteSpace(parsed.RequestedTime);

        // When user DID NOT specify a time, personal tasks prefer outside-work-hour slots.
        // When user DID specify a time, we honour it (even if it falls during work hours)
        // and only use the full personal window for conflict-fallback.
        bool preferOutsideWork = isPersonal && !userSpecifiedTime;

        // Issue 2: Detect AI-produced invalid calendar date (e.g. Feb 29 in non-leap year)
        bool requestedDateInvalid =
            !string.IsNullOrWhiteSpace(parsed.RequestedDate) &&
            !DateTime.TryParse(parsed.RequestedDate, out _);

        // Pass null date to resolver when the date string is invalid so it doesn't silently
        // fall back to "today" for a clearly wrong date.
        DateTime? preferredStart = ResolveRequestedSlot(
            requestedDateInvalid ? null : parsed.RequestedDate,
            parsed.RequestedTime,
            currentLocalTime,
            routine);

        DateTime? slotStart      = null;
        bool      allocatedOut   = false;
        string    allocationNote = string.Empty;

        if (requestedDateInvalid)
        {
            // Issue 2: Invalid date — note it and find next available slot
            allocatedOut   = true;
            allocationNote = $"The date '{parsed.RequestedDate}' is not a valid calendar date; scheduled at next available slot.";
            slotStart = FindBestSlot(
                currentLocalTime, durationMinutes, allBlocks, usedMinutesPerDay, routine,
                taskCategory, preferOutsideWork);
        }
        else if (isPersonal && !userSpecifiedTime &&
                 preferredStart.HasValue && preferredStart.Value > currentLocalTime)
        {
            // Personal task with a date anchor but NO explicit time.
            // Start searching from the beginning of the personal window on that date so the
            // outside-work-hours preference works correctly (rather than jumping in at the
            // work-window start that ResolveRequestedSlot derived).
            (TimeSpan personalWinStart, _) = GetPersonalAllowedWindow(routine, preferredStart.Value.Date);
            DateTime dateSearchStart = preferredStart.Value.Date + personalWinStart;
            if (dateSearchStart < currentLocalTime) dateSearchStart = currentLocalTime;
            slotStart = FindBestSlot(
                dateSearchStart, durationMinutes, allBlocks, usedMinutesPerDay, routine,
                "personal", preferOutsideWorkHours: true);
        }
        else if (preferredStart.HasValue && preferredStart.Value > currentLocalTime)
        {
            // User specified a time (and possibly a date) — try it directly.
            // For personal tasks this may be during work hours, which is fine.
            (TimeSpan winStart, TimeSpan winEnd) =
                GetAllowedWindowForTask(routine, preferredStart.Value.Date, taskCategory);
            DateTime dayWinStart = preferredStart.Value.Date + winStart;
            DateTime dayWinEnd   = preferredStart.Value.Date + winEnd;

            if (preferredStart.Value < dayWinStart)
            {
                // Issue 1: Requested time is before wakeup — move to after wakeup
                allocatedOut = true;
                string wakeLabel = !string.IsNullOrWhiteSpace(routine?.WakeUpTime)
                    ? routine.WakeUpTime : "08:00";
                allocationNote = $"Requested time {parsed.RequestedTime} is before the usual wakeup time ({wakeLabel}); moved to next available slot after wakeup.";
                // No outside-work preference here: user gave an explicit time
                slotStart = FindBestSlot(
                    dayWinStart, durationMinutes, allBlocks, usedMinutesPerDay, routine,
                    taskCategory, preferOutsideWorkHours: false);
            }
            else if (preferredStart.Value >= dayWinEnd)
            {
                // Requested time is after sleep — move to next day
                allocatedOut   = true;
                allocationNote = $"Requested time {parsed.RequestedTime} is after the usual sleep time; moved to next available slot.";
                slotStart = FindBestSlot(
                    preferredStart.Value.Date.AddDays(1) + winStart,
                    durationMinutes, allBlocks, usedMinutesPerDay, routine,
                    taskCategory, preferOutsideWorkHours: false);
            }
            else
            {
                // Preferred slot is within the allowed window — check conflict / capacity
                bool free        = !HasConflict(
                    preferredStart.Value,
                    preferredStart.Value.AddMinutes(durationMinutes),
                    allBlocks, BreakMinutes);
                int  dayUsed     = GetDayUsedMinutes(usedMinutesPerDay, preferredStart.Value.Date);
                bool hasCapacity = dayUsed + durationMinutes <= MaxDailyMinutes;

                if (free && hasCapacity)
                {
                    slotStart = preferredStart.Value;
                }
                else
                {
                    allocatedOut   = true;
                    allocationNote = free
                        ? "Day was full at the requested time; moved to next available slot."
                        : "Requested time conflicted with an existing task; moved to next available slot.";
                    // User specified a time → use full window for fallback, no outside-work preference
                    slotStart = FindBestSlot(
                        preferredStart.Value, durationMinutes, allBlocks, usedMinutesPerDay, routine,
                        taskCategory, preferOutsideWorkHours: false);
                }
            }
        }
        else
        {
            // No preferred slot (or already in the past) — find next best slot
            slotStart = FindBestSlot(
                currentLocalTime, durationMinutes, allBlocks, usedMinutesPerDay, routine,
                taskCategory, preferOutsideWork);
        }

        if (!slotStart.HasValue) return null;

        DateTime slotEnd = slotStart.Value.AddMinutes(durationMinutes);
        RegisterBlock(allBlocks, usedMinutesPerDay, slotStart.Value, slotEnd, durationMinutes);

        var result = BuildResult(parsed, slotStart.Value, slotEnd);
        result.IsAllocatedOutsideRequestedTime = allocatedOut;
        result.AllocationNote                  = allocationNote;
        return result;
    }

      private List<ScheduledTaskResult> ScheduleRecurring(
        ParsedTaskRequest parsed,
        int durationMinutes,
        DateTime currentLocalTime,
        RoutineProfile? routine,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay)
    {
        string taskCategory = (parsed.TaskCategory ?? "work").ToLower();
        int    count        = Math.Min(Math.Max(parsed.RecurrenceCount, 1), MaxRecurrenceCount);
        var    results      = new List<ScheduledTaskResult>();

        TimeSpan? preferredTimeOfDay = null;
        if (!string.IsNullOrWhiteSpace(parsed.RequestedTime) &&
            TimeSpan.TryParse(parsed.RequestedTime, out TimeSpan parsedTime))
        {
            preferredTimeOfDay = parsedTime;
        }

        // Detect invalid date (Issue 2) so we don't anchor the series to a bad date
        bool requestedDateInvalid =
            !string.IsNullOrWhiteSpace(parsed.RequestedDate) &&
            !DateTime.TryParse(parsed.RequestedDate, out _);

        DateTime? anchorDate = null;
        if (!requestedDateInvalid &&
            !string.IsNullOrWhiteSpace(parsed.RequestedDate) &&
            DateTime.TryParse(parsed.RequestedDate, out DateTime parsedAnchor))
        {
            anchorDate = parsedAnchor.Date;
        }

        // Build the series start time, anchoring to the preferred time-of-day consistently
        // so ALL instances land at that time (not just instances 2-N).
        DateTime searchFrom;
        if (preferredTimeOfDay.HasValue)
        {
            DateTime startDate = anchorDate.HasValue && anchorDate.Value >= currentLocalTime.Date
                ? anchorDate.Value
                : currentLocalTime.Date;

            // Enforce wakeup: if preferred time is before wakeup, start from next day
            (TimeSpan wakeupWinStart, _) = GetAllowedWindowForTask(routine, startDate, taskCategory);
            if (preferredTimeOfDay.Value < wakeupWinStart)
                startDate = startDate.AddDays(1);

            DateTime candidateStart = startDate + preferredTimeOfDay.Value;

            searchFrom = candidateStart > currentLocalTime
                ? candidateStart
                : currentLocalTime.Date.AddDays(1) + preferredTimeOfDay.Value;
        }
        else
        {
            searchFrom = anchorDate.HasValue && anchorDate.Value >= currentLocalTime.Date
                ? anchorDate.Value + GetRoutineWindowStartForTask(routine, taskCategory)
                : currentLocalTime;

            if (searchFrom < currentLocalTime)
                searchFrom = currentLocalTime;
        }

        DayOfWeek? preferredDayOfWeek = anchorDate.HasValue ? anchorDate.Value.DayOfWeek : null;

        // Base note for invalid date (applied to first instance only)
        string invalidDateNote = requestedDateInvalid
            ? $"The date '{parsed.RequestedDate}' is not a valid calendar date; series starts from next available slot."
            : string.Empty;

        for (int i = 0; i < count; i++)
        {
            DateTime? slotStart = parsed.RecurrenceType switch
            {
                "daily"   => FindNextSlotDaily(searchFrom, durationMinutes, allBlocks,
                                 usedMinutesPerDay, routine, preferredTimeOfDay, taskCategory),
                "weekly"  => FindNextSlotWeekly(searchFrom, durationMinutes, allBlocks,
                                 usedMinutesPerDay, routine, preferredTimeOfDay, preferredDayOfWeek, taskCategory),
                "monthly" => FindNextSlotMonthly(searchFrom, durationMinutes, allBlocks,
                                 usedMinutesPerDay, routine, preferredTimeOfDay, anchorDate?.Day, taskCategory),
                _         => FindBestSlot(searchFrom, durationMinutes, allBlocks,
                                 usedMinutesPerDay, routine, taskCategory,
                                 taskCategory == "personal" && !preferredTimeOfDay.HasValue)
            };

            if (!slotStart.HasValue) break;

            DateTime slotEnd = slotStart.Value.AddMinutes(durationMinutes);
            RegisterBlock(allBlocks, usedMinutesPerDay, slotStart.Value, slotEnd, durationMinutes);

            var result = BuildResult(parsed, slotStart.Value, slotEnd);
            result.IsRecurring    = true;
            result.RecurrenceType = parsed.RecurrenceType;

            // Enhancement 3: use AllocationNote instead of appending to Comments
            if (preferredTimeOfDay.HasValue &&
                slotStart.Value.TimeOfDay != preferredTimeOfDay.Value)
            {
                result.IsAllocatedOutsideRequestedTime = true;
                result.AllocationNote =
                    $"Preferred time {preferredTimeOfDay.Value:hh\\:mm} was not available on this day; scheduled at next available slot.";
            }

            // Attach invalid-date note to the first instance
            if (i == 0 && !string.IsNullOrEmpty(invalidDateNote))
            {
                result.IsAllocatedOutsideRequestedTime = true;
                result.AllocationNote = string.IsNullOrEmpty(result.AllocationNote)
                    ? invalidDateNote
                    : $"{invalidDateNote} {result.AllocationNote}";
            }

            results.Add(result);

            // Advance searchFrom past this instance so the next one starts the next day
            searchFrom = slotStart.Value.Date.AddDays(1);
        }

        return results;
    }

    private DateTime? FindBestSlot(
        DateTime searchFrom,
        int durationMinutes,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay,
        RoutineProfile? routine,
        string taskCategory = "work",
        bool preferOutsideWorkHours = false)
    {
        taskCategory = (taskCategory ?? "work").ToLower();

        if (taskCategory == "personal")
        {
            if (preferOutsideWorkHours)
            {
                // Enhancement 1: only prefer outside work hours when user did NOT specify a time.
                // When the user gave an explicit time, the full personal window is used directly.
                var outsideSlot = FindNextSlotOutsideWorkHours(
                    searchFrom, durationMinutes, allBlocks, usedMinutesPerDay, routine);
                if (outsideSlot.HasValue) return outsideSlot;
            }

            // Full personal window: wakeup-to-sleep (includes work hours as a fallback).
            return FindNextSlot(
                searchFrom, durationMinutes, allBlocks, usedMinutesPerDay, routine, "personal");
        }
        else
        {
            // Enhancement 2: for work tasks, try productivity hours first
            var prodSlot = TryFindSlotInProductivityHours(
                searchFrom, durationMinutes, allBlocks, usedMinutesPerDay, routine);
            if (prodSlot.HasValue) return prodSlot;

            // Fallback: regular work window
            return FindNextSlot(
                searchFrom, durationMinutes, allBlocks, usedMinutesPerDay, routine, "work");
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // CORE SLOT-FINDING ALGORITHM (FindNextSlot)
    // ═════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Finds the next free slot of at least <paramref name="durationMinutes"/> starting from
    /// <paramref name="searchFrom"/> (local time), respecting routine constraints and 8-hour cap.
    /// Uses the window appropriate for <paramref name="taskCategory"/>.
    /// </summary>
    private DateTime? FindNextSlot(
        DateTime searchFrom,
        int durationMinutes,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay,
        RoutineProfile? routine,
        string taskCategory = "work")
    {
        for (int day = 0; day < MaxSearchDays; day++)
        {
            DateTime currentDay = searchFrom.Date.AddDays(day);

            (TimeSpan winStart, TimeSpan winEnd) =
                GetAllowedWindowForTask(routine, currentDay, taskCategory);
            DateTime windowStart = currentDay + winStart;
            DateTime windowEnd   = currentDay + winEnd;

            // On the first iteration, don't go before searchFrom
            if (day == 0 && searchFrom > windowStart)
                windowStart = searchFrom;

            var slot = FindSlotInWindow(
                windowStart, windowEnd, durationMinutes, allBlocks, usedMinutesPerDay, currentDay);
            if (slot.HasValue) return slot;
        }

        return null;
    }

    /// <summary>
    /// Cursor-based search within [windowStart, windowEnd] for a single day.
    /// Returns the first free start time, or null if none found.
    /// </summary>
    private DateTime? FindSlotInWindow(
        DateTime windowStart,
        DateTime windowEnd,
        int durationMinutes,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay,
        DateTime day)
    {
        if ((windowEnd - windowStart).TotalMinutes < durationMinutes)
            return null;

        int dayUsed = GetDayUsedMinutes(usedMinutesPerDay, day);
        if (dayUsed + durationMinutes > MaxDailyMinutes)
            return null;

        var dayBlocks = allBlocks
            .Where(b => b.Start.Date == day || b.End.Date == day)
            .OrderBy(b => b.Start)
            .ToList();

        DateTime cursor = windowStart;

        while (cursor.AddMinutes(durationMinutes) <= windowEnd)
        {
            if (dayUsed + durationMinutes > MaxDailyMinutes) break;

            DateTime tentativeEnd = cursor.AddMinutes(durationMinutes);

            var conflicting = dayBlocks.FirstOrDefault(b =>
                b.Start < tentativeEnd.AddMinutes(BreakMinutes) &&
                b.End   > cursor.AddMinutes(-BreakMinutes));

            if (conflicting == null)
                return cursor;

            cursor = conflicting.End.AddMinutes(BreakMinutes);
        }

        return null;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // CATEGORY-SPECIFIC SLOT FINDERS
    // ═════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Enhancement 1: For personal tasks, search before and after work hours on each day
    /// before considering work-hour slots.
    /// Returns null if no outside-work slot is found (caller falls back to full personal window).
    /// </summary>
    private DateTime? FindNextSlotOutsideWorkHours(
        DateTime searchFrom,
        int durationMinutes,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay,
        RoutineProfile? routine)
    {
        if (routine?.WorkStyleSettings == null ||
            !TryParseTime(routine.WorkStyleSettings.WorkHourStart, out TimeSpan workStart) ||
            !TryParseTime(routine.WorkStyleSettings.WorkHourEnd,   out TimeSpan workEnd))
            return null; // No work hours defined; caller handles fallback

        for (int day = 0; day < MaxSearchDays; day++)
        {
            DateTime currentDay = searchFrom.Date.AddDays(day);
            (TimeSpan personalStart, TimeSpan personalEnd) =
                GetPersonalAllowedWindow(routine, currentDay);

            // Pass 1: Before work hours (wakeup → work start)
            if (personalStart < workStart)
            {
                DateTime bwStart = currentDay + personalStart;
                DateTime bwEnd   = currentDay + workStart;
                if (day == 0 && searchFrom > bwStart) bwStart = searchFrom;
                if (bwStart < bwEnd)
                {
                    var slot = FindSlotInWindow(
                        bwStart, bwEnd, durationMinutes, allBlocks, usedMinutesPerDay, currentDay);
                    if (slot.HasValue) return slot;
                }
            }

            // Pass 2: After work hours (work end → sleep)
            if (workEnd < personalEnd)
            {
                DateTime awStart = currentDay + workEnd;
                DateTime awEnd   = currentDay + personalEnd;
                if (day == 0 && searchFrom > awStart) awStart = searchFrom;
                if (awStart < awEnd)
                {
                    var slot = FindSlotInWindow(
                        awStart, awEnd, durationMinutes, allBlocks, usedMinutesPerDay, currentDay);
                    if (slot.HasValue) return slot;
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Enhancement 2: For work tasks, try to find a slot within the user's defined
    /// productivity hour windows before falling back to general work hours.
    /// Returns null when no productivity hours are defined or all are booked.
    /// </summary>
    private DateTime? TryFindSlotInProductivityHours(
        DateTime searchFrom,
        int durationMinutes,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay,
        RoutineProfile? routine)
    {
        if (routine?.WorkStyleSettings?.ProductiveHours == null ||
            !routine.WorkStyleSettings.ProductiveHours.Any())
            return null;

        // Productivity windows should be within work hours
        (TimeSpan workWinStart, TimeSpan workWinEnd) = GetAllowedWindow(routine, DateTime.Today);

        var orderedProdWindows = routine.WorkStyleSettings.ProductiveHours
            .Where(h => ProdHourWindows.ContainsKey(h))
            .Select(h => ProdHourWindows[h])
            .OrderBy(w => w.Start)
            .ToList();

        for (int day = 0; day < MaxSearchDays; day++)
        {
            DateTime currentDay = searchFrom.Date.AddDays(day);

            foreach (var (pwStart, pwEnd) in orderedProdWindows)
            {
                // Clip to work window
                TimeSpan clippedStart = pwStart < workWinStart ? workWinStart : pwStart;
                TimeSpan clippedEnd   = pwEnd   > workWinEnd   ? workWinEnd   : pwEnd;
                if (clippedEnd <= clippedStart) continue;

                DateTime winStart = currentDay + clippedStart;
                DateTime winEnd   = currentDay + clippedEnd;

                if (day == 0 && searchFrom > winStart) winStart = searchFrom;
                if (winStart >= winEnd) continue;

                var slot = FindSlotInWindow(
                    winStart, winEnd, durationMinutes, allBlocks, usedMinutesPerDay, currentDay);
                if (slot.HasValue) return slot;
            }
        }

        return null;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // RECURRENCE PATTERN HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    private DateTime? FindNextSlotDaily(
        DateTime searchFrom,
        int durationMinutes,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay,
        RoutineProfile? routine,
        TimeSpan? preferredTimeOfDay,
        string taskCategory = "work")
    {
        DateTime dayToTry = searchFrom.Date;
        int attempts = MaxSearchDays;

        while (attempts-- > 0)
        {
            (TimeSpan winStart, TimeSpan winEnd) =
                GetAllowedWindowForTask(routine, dayToTry, taskCategory);
            DateTime windowStart = dayToTry + winStart;
            DateTime windowEnd   = dayToTry + winEnd;

            DateTime candidate = preferredTimeOfDay.HasValue
                ? dayToTry + preferredTimeOfDay.Value
                : windowStart;

            // Enforce wakeup time and searchFrom lower bound
            if (candidate < windowStart) candidate = windowStart;
            if (candidate < searchFrom)  candidate = searchFrom;

            if (candidate.AddMinutes(durationMinutes) <= windowEnd)
            {
                bool free     = !HasConflict(candidate, candidate.AddMinutes(durationMinutes),
                                             allBlocks, BreakMinutes);
                int  dayUsed  = GetDayUsedMinutes(usedMinutesPerDay, dayToTry);
                bool capacity = dayUsed + durationMinutes <= MaxDailyMinutes;

                if (free && capacity)
                    return candidate;
            }

            // Preferred time is taken; search forward from preferred time (not window start)
            // so we never book a slot earlier than what was requested.
            DateTime fallbackStart = preferredTimeOfDay.HasValue
                ? dayToTry + preferredTimeOfDay.Value
                : windowStart;
            if (fallbackStart < windowStart) fallbackStart = windowStart;

            // For personal recurring tasks, only prefer outside-work-hours when the user
            // did not specify a preferred time. If a time was given, use the full personal window.
            bool dailyPreferOutside = taskCategory == "personal" && !preferredTimeOfDay.HasValue;
            var fallback = FindBestSlot(
                fallbackStart, durationMinutes, allBlocks, usedMinutesPerDay, routine,
                taskCategory, dailyPreferOutside);
            if (fallback.HasValue && fallback.Value.Date == dayToTry)
                return fallback;

            dayToTry = dayToTry.AddDays(1);
        }

        return null;
    }

    private DateTime? FindNextSlotWeekly(
        DateTime searchFrom,
        int durationMinutes,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay,
        RoutineProfile? routine,
        TimeSpan? preferredTimeOfDay,
        DayOfWeek? preferredDay,
        string taskCategory = "work")
    {
        DateTime searchDate = searchFrom.Date;
        int maxWeeks = Math.Min(MaxSearchDays / 7 + 1, 9);

        for (int week = 0; week < maxWeeks; week++)
        {
            DateTime targetDay = searchDate;

            if (preferredDay.HasValue)
            {
                int daysUntil = ((int)preferredDay.Value - (int)searchDate.DayOfWeek + 7) % 7;
                if (daysUntil == 0 && week > 0) daysUntil = 7;
                targetDay = searchDate.AddDays(daysUntil);
            }

            // Compute candidate start and enforce wakeup
            (TimeSpan winStart, _) = GetAllowedWindowForTask(routine, targetDay, taskCategory);
            DateTime dayWindowStart = targetDay + winStart;

            DateTime candidate = preferredTimeOfDay.HasValue
                ? targetDay + preferredTimeOfDay.Value
                : dayWindowStart;

            if (candidate < dayWindowStart) candidate = dayWindowStart;
            if (candidate < searchFrom)     candidate = searchFrom;

            bool weeklyPreferOutside = taskCategory == "personal" && !preferredTimeOfDay.HasValue;
            var slot = FindBestSlot(
                candidate, durationMinutes, allBlocks, usedMinutesPerDay, routine,
                taskCategory, weeklyPreferOutside);
            if (slot.HasValue)
                return slot;

            searchDate = targetDay.AddDays(1);
        }

        return null;
    }

    private DateTime? FindNextSlotMonthly(
        DateTime searchFrom,
        int durationMinutes,
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay,
        RoutineProfile? routine,
        TimeSpan? preferredTimeOfDay,
        int? preferredDayOfMonth,
        string taskCategory = "work")
    {
        DateTime searchDate = searchFrom.Date;
        int maxMonths = MaxSearchDays / 28 + 1;

        for (int month = 0; month < maxMonths; month++)
        {
            DateTime targetDay;

            if (preferredDayOfMonth.HasValue)
            {
                int daysInMonth = DateTime.DaysInMonth(searchDate.Year, searchDate.Month);
                int dayNum      = Math.Min(preferredDayOfMonth.Value, daysInMonth);
                targetDay       = new DateTime(searchDate.Year, searchDate.Month, dayNum);

                if (targetDay < searchDate)
                {
                    var next    = searchDate.AddMonths(1);
                    daysInMonth = DateTime.DaysInMonth(next.Year, next.Month);
                    dayNum      = Math.Min(preferredDayOfMonth.Value, daysInMonth);
                    targetDay   = new DateTime(next.Year, next.Month, dayNum);
                }
            }
            else
            {
                targetDay = searchDate;
            }

            // Compute candidate start and enforce wakeup
            (TimeSpan winStart, _) = GetAllowedWindowForTask(routine, targetDay, taskCategory);
            DateTime dayWindowStart = targetDay + winStart;

            DateTime candidate = preferredTimeOfDay.HasValue
                ? targetDay + preferredTimeOfDay.Value
                : dayWindowStart;

            if (candidate < dayWindowStart) candidate = dayWindowStart;
            if (candidate < searchFrom)     candidate = searchFrom;

            bool monthlyPreferOutside = taskCategory == "personal" && !preferredTimeOfDay.HasValue;
            var slot = FindBestSlot(
                candidate, durationMinutes, allBlocks, usedMinutesPerDay, routine,
                taskCategory, monthlyPreferOutside);
            if (slot.HasValue) return slot;

            searchDate = new DateTime(targetDay.Year, targetDay.Month, 1).AddMonths(1);
        }

        return null;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ROUTINE / WINDOW HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Returns the allowed scheduling window for a day based on task category.
    /// Personal tasks use the broader wakeup-to-sleep window (not restricted by work hours).
    /// Work tasks use the existing work-hour-aware window.
    /// </summary>
    private (TimeSpan start, TimeSpan end) GetAllowedWindowForTask(
        RoutineProfile? routine, DateTime day, string taskCategory)
    {
        return (taskCategory ?? "work").ToLower() == "personal"
            ? GetPersonalAllowedWindow(routine, day)
            : GetAllowedWindow(routine, day);
    }

    /// <summary>
    /// Personal-task window: wakeup → sleep, no work-hour restriction.
    /// Constraints (NoTaskBefore/After) still apply.
    /// </summary>
    private (TimeSpan start, TimeSpan end) GetPersonalAllowedWindow(
        RoutineProfile? routine, DateTime day)
    {
        TimeSpan winStart = FallbackWindowStart;
        TimeSpan winEnd   = FallbackWindowEnd;

        if (routine == null)
            return (winStart, winEnd);

        if (TryParseTime(routine.WakeUpTime, out TimeSpan wakeUp)) winStart = wakeUp;
        if (TryParseTime(routine.SleepTime,  out TimeSpan sleep))  winEnd   = sleep;

        // Apply constraints but NOT work-hour restriction
        if (routine.Constraints != null)
        {
            if (TryParseTime(routine.Constraints.NoTaskBefore, out TimeSpan ntb) && ntb > winStart)
                winStart = ntb;
            if (TryParseTime(routine.Constraints.NoTaskAfter, out TimeSpan nta) && nta < winEnd)
                winEnd = nta;
        }

        if (winEnd <= winStart)
            return (FallbackWindowStart, FallbackWindowEnd);

        return (winStart, winEnd);
    }

    /// <summary>
    /// Work-task window.
    /// Priority (applied in order): WakeUp/Sleep → WorkHours → NoTaskBefore/After.
    /// Falls back to 08:00-20:00 when routine is null or misconfigured.
    /// </summary>
    private (TimeSpan start, TimeSpan end) GetAllowedWindow(RoutineProfile? routine, DateTime day)
    {
        TimeSpan winStart = FallbackWindowStart;
        TimeSpan winEnd   = FallbackWindowEnd;

        if (routine == null)
            return (winStart, winEnd);

        if (TryParseTime(routine.WakeUpTime, out TimeSpan wakeUp)) winStart = wakeUp;
        if (TryParseTime(routine.SleepTime,  out TimeSpan sleep))  winEnd   = sleep;

        if (routine.WorkStyleSettings != null)
        {
            if (TryParseTime(routine.WorkStyleSettings.WorkHourStart, out TimeSpan ws) && ws > winStart)
                winStart = ws;
            if (TryParseTime(routine.WorkStyleSettings.WorkHourEnd, out TimeSpan we) && we < winEnd)
                winEnd = we;
        }

        if (routine.Constraints != null)
        {
            if (TryParseTime(routine.Constraints.NoTaskBefore, out TimeSpan ntb) && ntb > winStart)
                winStart = ntb;
            if (TryParseTime(routine.Constraints.NoTaskAfter, out TimeSpan nta) && nta < winEnd)
                winEnd = nta;
        }

        if (winEnd <= winStart)
            return (FallbackWindowStart, FallbackWindowEnd);

        return (winStart, winEnd);
    }

    private TimeSpan GetRoutineWindowStart(RoutineProfile? routine)
        => GetAllowedWindow(routine, DateTime.Today).start;

    private TimeSpan GetRoutineWindowStartForTask(RoutineProfile? routine, string taskCategory)
        => GetAllowedWindowForTask(routine, DateTime.Today, taskCategory).start;

    // ═════════════════════════════════════════════════════════════════════════
    // CONFLICT / CAPACITY HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    private static bool HasConflict(
        DateTime start, DateTime end, List<TimeBlock> blocks, int breakMinutes)
    {
        return blocks.Any(b =>
            b.Start < end.AddMinutes(breakMinutes) &&
            b.End   > start.AddMinutes(-breakMinutes));
    }

    private static int GetDayUsedMinutes(Dictionary<DateTime, int> usedMinutesPerDay, DateTime day)
    {
        return usedMinutesPerDay.TryGetValue(day.Date, out int used) ? used : 0;
    }

    private static void RegisterBlock(
        List<TimeBlock> allBlocks,
        Dictionary<DateTime, int> usedMinutesPerDay,
        DateTime start, DateTime end, int durationMinutes)
    {
        allBlocks.Add(new TimeBlock { Start = start, End = end });

        var day = start.Date;
        if (!usedMinutesPerDay.ContainsKey(day)) usedMinutesPerDay[day] = 0;
        usedMinutesPerDay[day] += durationMinutes;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // UTILITY HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Converts the AI's RequestedDate + RequestedTime strings into a local DateTime.
    /// - Date only  → uses routine window start as time
    /// - Time only  → uses today's date
    /// - Neither    → returns null (caller falls through to FindBestSlot)
    /// </summary>
    private DateTime? ResolveRequestedSlot(
        string? requestedDate, string? requestedTime,
        DateTime currentLocalTime, RoutineProfile? routine)
    {
        bool hasDate = false;
        bool hasTime = false;
        DateTime parsedDate = default;
        TimeSpan parsedTime = default;

        if (!string.IsNullOrWhiteSpace(requestedDate))
            hasDate = DateTime.TryParse(requestedDate, out parsedDate);

        if (!string.IsNullOrWhiteSpace(requestedTime))
            hasTime = TimeSpan.TryParse(requestedTime, out parsedTime);

        if (!hasDate && !hasTime) return null;

        DateTime date = hasDate ? parsedDate.Date : currentLocalTime.Date;
        TimeSpan time = hasTime ? parsedTime      : GetRoutineWindowStart(routine);

        return DateTime.SpecifyKind(date + time, DateTimeKind.Unspecified);
    }

    private static int PriorityOrder(ParsedTaskRequest t) => (t.Priority ?? "medium").ToLower() switch
    {
        "high"   => 0,
        "medium" => 1,
        "low"    => 2,
        _        => 1
    };

    private static bool TryParseTime(string? raw, out TimeSpan result)
    {
        result = default;
        return !string.IsNullOrWhiteSpace(raw) && TimeSpan.TryParse(raw, out result);
    }

    private static string StripMarkdownFences(string raw)
    {
        if (raw.StartsWith("```"))
        {
            int newline = raw.IndexOf('\n');
            if (newline >= 0) raw = raw[(newline + 1)..];
            if (raw.TrimEnd().EndsWith("```"))
                raw = raw[..raw.LastIndexOf("```")].TrimEnd();
        }
        return raw;
    }

    private static ScheduledTaskResult BuildResult(
        ParsedTaskRequest parsed, DateTime localStart, DateTime localEnd)
    {
        return new ScheduledTaskResult
        {
            Title          = parsed.Title,
            Day            = localStart.DayOfWeek.ToString(),
            Start          = localStart.ToString("yyyy-MM-ddTHH:mm"),
            End            = localEnd.ToString("yyyy-MM-ddTHH:mm"),
            Priority       = (parsed.Priority ?? "medium").ToLower(),
            TaskCategory   = (parsed.TaskCategory ?? "work").ToLower(),
            Comments       = parsed.Comments ?? string.Empty,
            IsRecurring    = parsed.IsRecurring,
            RecurrenceType = parsed.RecurrenceType ?? "none"
            // IsAllocatedOutsideRequestedTime and AllocationNote are set by callers
        };
    }
}
