using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Moq;
using SmartTaskManager.Models;
using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;
using Xunit;

namespace Service.Tests.Services;

/// <summary>
/// Unit tests for TaskSchedulingService.
///
/// Strategy:
///   - IChatCompletionService is mocked to return a predetermined ParsedTaskRequest JSON,
///     bypassing OpenAI and eliminating API charges.
///   - ITaskRepository is mocked to return an empty schedule (no existing conflicts).
///   - IUserRoutineRepositary is mocked to return a standard 9-5 routine.
///   - Only Phase 2 (deterministic C# scheduling) is exercised in each test.
///
/// Test date: 2026-03-06 (Friday), timezone UTC.
/// Routine:   wakeup 07:00 | work 09:00-17:00 | sleep 23:00
/// </summary>
public class TaskSchedulingServiceTests
{
    // ─── Fixed test anchors ───────────────────────────────────────────────
    private const string CurrentDate = "2026-03-06T09:00";  // Friday
    private const string TestTimeZone = "UTC";
    private const string UserId = "test-user-001";

    // Concrete dates used by the test scenarios
    private const string NextMonday  = "2026-03-09";   // Monday  (T1)
    private const string NextTuesday = "2026-03-10";   // Tuesday (T2)
    private const string SpecificDate = "2026-03-15";  // Sunday  (T3, T4)

    // ─── Shared mocks ────────────────────────────────────────────────────
    private readonly Mock<IChatCompletionService> _mockChat;
    private readonly Mock<ITaskRepository>        _mockTaskRepo;
    private readonly Mock<IUserRoutineRepositary>  _mockRoutineRepo;
    private readonly TaskSchedulingService         _sut;   // system under test

    public TaskSchedulingServiceTests()
    {
        // 1. Chat service mock — concrete implementation returned via GetChatMessageContentsAsync
        //    (GetChatMessageContentAsync is an extension that delegates to the plural method)
        _mockChat = new Mock<IChatCompletionService>();
        _mockChat.Setup(s => s.Attributes)
                 .Returns(new Dictionary<string, object?>());

        // Build a real Kernel that resolves IChatCompletionService from our mock
        var kernelBuilder = Kernel.CreateBuilder();
        kernelBuilder.Services.AddSingleton<IChatCompletionService>(_mockChat.Object);
        Kernel kernel = kernelBuilder.Build();

        // 2. Repository mocks — no existing tasks, standard routine
        _mockTaskRepo = new Mock<ITaskRepository>();
        _mockTaskRepo
            .Setup(r => r.GetTasksAsync(It.IsAny<string>(), It.IsAny<TaskFilterRequest>()))
            .ReturnsAsync(new List<SmartTaskManager.Models.DTO.TaskItem>());

        _mockRoutineRepo = new Mock<IUserRoutineRepositary>();
        _mockRoutineRepo
            .Setup(r => r.GetUserRoutineAsync(It.IsAny<string>()))
            .ReturnsAsync(BuildDefaultRoutine());

        // 3. Logger (no-op)
        var logger = new Mock<ILogger<TaskSchedulingService>>().Object;

        _sut = new TaskSchedulingService(kernel, _mockTaskRepo.Object, _mockRoutineRepo.Object, logger);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 1 — "Need to do testing on Monday"
    //
    // AI parses the request as: work task, date = next Monday, no specific time.
    // Scheduler should place the task on Monday within work hours (09:00-17:00).
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ScheduleOnMonday_NoTime_PlacesTaskOnMondayWithinWorkHours()
    {
        ArrangeAiResponse(new ParsedTaskRequest
        {
            Title           = "Need to do testing",
            DurationMinutes = 60,
            Priority        = "medium",
            TaskCategory    = "work",
            RequestedDate   = NextMonday,    // 2026-03-09
            RequestedTime   = null,
            IsRecurring     = false,
            RecurrenceType  = "none",
            RecurrenceCount = 1,
            Comments        = "Testing activity scheduled for Monday"
        });

        var results = await _sut.ScheduleTasksAsync(BuildRequest("Need to do testing on Monday"), UserId);

        Assert.Single(results);
        var task = results[0];

        // Must land on Monday 2026-03-09
        Assert.Equal("Monday", task.Day);
        Assert.StartsWith(NextMonday, task.Start);

        // Must start within work hours (09:00 - 17:00)
        var start = DateTime.Parse(task.Start);
        Assert.True(start.Hour >= 9, $"Expected start >= 09:00 but got {task.Start}");
        Assert.True(start.Hour < 17, $"Expected start < 17:00 but got {task.Start}");

        // No allocation note because we asked for a date but no specific time
        Assert.False(task.IsAllocatedOutsideRequestedTime,
            $"Should not reallocate when only a date is requested. Note: {task.AllocationNote}");

        Assert.Equal("Need to do testing", task.Title);
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 2 — "Need to do testing on Tuesday at 5pm"
    //
    // AI parses: work task, date = next Tuesday, time = 17:00.
    // 17:00 equals WorkHourEnd, so a 60-minute task would run past work hours.
    // Scheduler should flag the reallocation and move it to next available slot.
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ScheduleOnTuesdayAt5pm_WorkTask_FlagsReallocationOutsideWorkHours()
    {
        ArrangeAiResponse(new ParsedTaskRequest
        {
            Title           = "Need to do testing",
            DurationMinutes = 60,
            Priority        = "medium",
            TaskCategory    = "work",
            RequestedDate   = NextTuesday,   // 2026-03-10
            RequestedTime   = "17:00",        // equals WorkHourEnd → outside window
            IsRecurring     = false,
            RecurrenceType  = "none",
            RecurrenceCount = 1,
            Comments        = "Testing scheduled for Tuesday at 5pm"
        });

        var results = await _sut.ScheduleTasksAsync(
            BuildRequest("Need to do testing on Tuesday at 5pm"), UserId);

        Assert.Single(results);
        var task = results[0];

        // Scheduler must flag that the requested time could not be honoured
        Assert.True(task.IsAllocatedOutsideRequestedTime,
            "17:00 equals WorkHourEnd so the slot should be moved and flagged");
        Assert.NotEmpty(task.AllocationNote);

        // Task must still be scheduled somewhere (just not at 17:00 Tuesday)
        Assert.False(string.IsNullOrWhiteSpace(task.Start));
        Assert.False(string.IsNullOrWhiteSpace(task.End));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 3 — "need to do testing on date" (specific date, no time)
    //
    // AI parses: work task, date = 2026-03-15 (Sunday), no time.
    // Scheduler should find the first available slot on that date
    // within work hours and place the task there without any allocation note.
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ScheduleOnSpecificDate_NoTime_PlacesTaskAtWorkHoursOnThatDate()
    {
        ArrangeAiResponse(new ParsedTaskRequest
        {
            Title           = "Need to do testing",
            DurationMinutes = 60,
            Priority        = "medium",
            TaskCategory    = "work",
            RequestedDate   = SpecificDate,  // 2026-03-15 (Sunday)
            RequestedTime   = null,
            IsRecurring     = false,
            RecurrenceType  = "none",
            RecurrenceCount = 1,
            Comments        = "Testing activity on the specified date"
        });

        var results = await _sut.ScheduleTasksAsync(
            BuildRequest("need to do testing on 2026-03-15"), UserId);

        Assert.Single(results);
        var task = results[0];

        // Must be on the requested date
        Assert.StartsWith(SpecificDate, task.Start);

        // Must start within work hours (09:00 - 17:00)
        var start = DateTime.Parse(task.Start);
        Assert.True(start.Hour >= 9,  $"Expected start >= 09:00 but got {task.Start}");
        Assert.True(start.Hour < 17,  $"Expected start < 17:00 but got {task.Start}");

        // Date was honoured — no reallocation flag
        Assert.False(task.IsAllocatedOutsideRequestedTime,
            $"Date was honoured, should not be flagged. Note: {task.AllocationNote}");
    }

    // ─────────────────────────────────────────────────────────────────────
    // Test 4 — "need to do testing on date at 7pm"
    //
    // AI parses: work task, date = 2026-03-15, time = 19:00.
    // 19:00 is well past WorkHourEnd (17:00) for a work task.
    // Scheduler should flag the reallocation and move it to the next available slot.
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ScheduleOnSpecificDateAt7pm_WorkTask_FlagsReallocationAfterWorkHours()
    {
        ArrangeAiResponse(new ParsedTaskRequest
        {
            Title           = "Need to do testing",
            DurationMinutes = 60,
            Priority        = "medium",
            TaskCategory    = "work",
            RequestedDate   = SpecificDate,  // 2026-03-15
            RequestedTime   = "19:00",        // after WorkHourEnd → outside window
            IsRecurring     = false,
            RecurrenceType  = "none",
            RecurrenceCount = 1,
            Comments        = "Testing activity on the specified date at 7pm"
        });

        var results = await _sut.ScheduleTasksAsync(
            BuildRequest("need to do testing on 2026-03-15 at 7pm"), UserId);

        Assert.Single(results);
        var task = results[0];

        // 19:00 is after work hours → must be flagged
        Assert.True(task.IsAllocatedOutsideRequestedTime,
            "19:00 is after WorkHourEnd (17:00) so the slot should be moved and flagged");
        Assert.NotEmpty(task.AllocationNote);

        // Must still produce a valid scheduled slot
        Assert.False(string.IsNullOrWhiteSpace(task.Start));
        Assert.False(string.IsNullOrWhiteSpace(task.End));
    }

    // ─────────────────────────────────────────────────────────────────────
    // Bonus — Within-work-hours request IS honoured
    //
    // Verifies the positive case: a work task requested at 14:00 (2pm)
    // is placed exactly at 14:00 with no allocation note.
    // ─────────────────────────────────────────────────────────────────────
    [Fact]
    public async Task ScheduleOnSpecificDateAt2pm_WorkTask_HonoursRequestedTime()
    {
        ArrangeAiResponse(new ParsedTaskRequest
        {
            Title           = "Need to do testing",
            DurationMinutes = 60,
            Priority        = "medium",
            TaskCategory    = "work",
            RequestedDate   = SpecificDate,  // 2026-03-15
            RequestedTime   = "14:00",        // well within 09:00-17:00 work window
            IsRecurring     = false,
            RecurrenceType  = "none",
            RecurrenceCount = 1,
            Comments        = "Testing at 2pm on the specified date"
        });

        var results = await _sut.ScheduleTasksAsync(
            BuildRequest("need to do testing on 2026-03-15 at 2pm"), UserId);

        Assert.Single(results);
        var task = results[0];

        // Requested time is within work hours with no conflict → must be honoured exactly
        Assert.False(task.IsAllocatedOutsideRequestedTime,
            $"14:00 is within work hours and there are no conflicts. Note: {task.AllocationNote}");

        var start = DateTime.Parse(task.Start);
        Assert.Equal(14, start.Hour);
        Assert.Equal(0,  start.Minute);
        Assert.StartsWith(SpecificDate, task.Start);
    }

    // ═════════════════════════════════════════════════════════════════════
    // Helpers
    // ═════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Configures the mock chat service to return a JSON-serialised ParsedTaskRequest
    /// wrapped in a ChatMessageContent, just as the real OpenAI call would.
    /// </summary>
    private void ArrangeAiResponse(ParsedTaskRequest parsed)
    {
        // Wrap in array — the service deserialises a List<ParsedTaskRequest>
        string json = JsonSerializer.Serialize(new List<ParsedTaskRequest> { parsed });

        _mockChat
            .Setup(s => s.GetChatMessageContentsAsync(
                It.IsAny<ChatHistory>(),
                It.IsAny<PromptExecutionSettings?>(),
                It.IsAny<Kernel?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ChatMessageContent>
            {
                new ChatMessageContent(AuthorRole.Assistant, json)
            });
    }

    private static OpenAiRequestBody BuildRequest(string userInput) => new()
    {
        UserInput   = userInput,
        CurrentDate = CurrentDate,
        TimeZone    = TestTimeZone
    };

    /// <summary>
    /// Standard routine: 07:00 wakeup, 09:00-17:00 work, 23:00 sleep, 60-min preferred duration.
    /// </summary>
    private static RoutineProfile BuildDefaultRoutine() => new()
    {
        Id         = "routine-default",
        WakeUpTime = "07:00",
        SleepTime  = "23:00",
        WorkStyleSettings = new WorkStyleSettings
        {
            WorkHourStart           = "09:00",
            WorkHourEnd             = "17:00",
            PreferredTaskDuration   = 60
        }
    };
}
