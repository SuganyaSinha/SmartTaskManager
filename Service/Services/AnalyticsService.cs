using SmartTaskManager.Models.DTO;
using SmartTaskManager.Repositary;
using TaskStatus = SmartTaskManager.Models.DTO.TaskStatus;

namespace SmartTaskManager.Services
{
    public class AnalyticsService : IAnalyticsService
    {
        private readonly ITaskRepository _taskRepository;

        public AnalyticsService(ITaskRepository taskRepository)
        {
            _taskRepository = taskRepository;
        }

        public async Task<ProductivityStatsDto> GetProductivityStatsAsync(string userId, string period, DateTime referenceDate, string? timeZone)
        {
            var (startDate, endDate) = GetDateRange(period, referenceDate, timeZone);

            var filter = new TaskFilterRequest
            {
                Start = startDate,
                End = endDate,
                Status = TaskStatus.All
            };

            var tasks = await _taskRepository.GetTasksAsync(userId, filter);

            var completed = tasks.Where(t => t.Status == TaskStatus.Completed).ToList();
            var blocked = tasks.Where(t => t.Status == TaskStatus.Blocked).ToList();

            var onTimeTasks = completed.Where(t =>
            {
                var completedAt = t.CompletedAt ?? t.LastUpdated;
                return t.End.HasValue && completedAt.HasValue && completedAt.Value <= t.End.Value;
            }).ToList();

            var allTasks = await _taskRepository.GetAllTasksAsync(userId);
            var streak = ComputeStreak(allTasks, timeZone);

            var stats = new ProductivityStatsDto
            {
                Period = period,
                StartDate = startDate,
                EndDate = endDate,
                TotalTasks = tasks.Count,
                CompletedTasks = completed.Count,
                CompletionRate = tasks.Count > 0 ? Math.Round((double)completed.Count / tasks.Count * 100, 1) : 0,
                OnTimeRate = completed.Count > 0 ? Math.Round((double)onTimeTasks.Count / completed.Count * 100, 1) : 0,
                BlockedTasks = blocked.Count,
                CurrentStreak = streak,
                PriorityBreakdown = BuildPriorityBreakdown(tasks),
                DailyTrend = BuildDailyTrend(tasks, startDate, endDate, timeZone),
                TimeByCategory = BuildTimeByCategory(tasks)
            };

            return stats;
        }

        private (DateTime start, DateTime end) GetDateRange(string period, DateTime referenceDate, string? timeZone)
        {
            var tz = string.IsNullOrEmpty(timeZone) ? TimeZoneInfo.Utc : TryGetTimeZone(timeZone);
            var localDate = TimeZoneInfo.ConvertTimeFromUtc(referenceDate.ToUniversalTime(), tz).Date;

            DateTime startLocal, endLocal;

            switch (period.ToLower())
            {
                case "day":
                    startLocal = localDate;
                    endLocal = localDate.AddDays(1).AddTicks(-1);
                    break;
                case "week":
                    var dayOfWeek = (int)localDate.DayOfWeek;
                    startLocal = localDate.AddDays(-dayOfWeek); // Sunday
                    endLocal = startLocal.AddDays(7).AddTicks(-1);
                    break;
                case "month":
                    startLocal = new DateTime(localDate.Year, localDate.Month, 1);
                    endLocal = startLocal.AddMonths(1).AddTicks(-1);
                    break;
                default:
                    startLocal = localDate;
                    endLocal = localDate.AddDays(1).AddTicks(-1);
                    break;
            }

            var startUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(startLocal, DateTimeKind.Unspecified), tz);
            var endUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(endLocal, DateTimeKind.Unspecified), tz);

            return (startUtc, endUtc);
        }

        private PriorityBreakdownDto BuildPriorityBreakdown(List<TaskItem> tasks)
        {
            return new PriorityBreakdownDto
            {
                High = new PriorityStatDto
                {
                    Total = tasks.Count(t => t.Priority?.ToLower() == "high"),
                    Completed = tasks.Count(t => t.Priority?.ToLower() == "high" && t.Status == TaskStatus.Completed)
                },
                Medium = new PriorityStatDto
                {
                    Total = tasks.Count(t => t.Priority?.ToLower() == "medium"),
                    Completed = tasks.Count(t => t.Priority?.ToLower() == "medium" && t.Status == TaskStatus.Completed)
                },
                Low = new PriorityStatDto
                {
                    Total = tasks.Count(t => t.Priority?.ToLower() == "low"),
                    Completed = tasks.Count(t => t.Priority?.ToLower() == "low" && t.Status == TaskStatus.Completed)
                }
            };
        }

        private List<DailyTrendDto> BuildDailyTrend(List<TaskItem> tasks, DateTime startUtc, DateTime endUtc, string? timeZone)
        {
            var tz = string.IsNullOrEmpty(timeZone) ? TimeZoneInfo.Utc : TryGetTimeZone(timeZone);
            var trend = new List<DailyTrendDto>();

            var current = TimeZoneInfo.ConvertTimeFromUtc(startUtc, tz).Date;
            var end = TimeZoneInfo.ConvertTimeFromUtc(endUtc, tz).Date;

            while (current <= end)
            {
                var dayStart = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(current, DateTimeKind.Unspecified), tz);
                var dayEnd = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(current.AddDays(1).AddTicks(-1), DateTimeKind.Unspecified), tz);

                var dayTasks = tasks.Where(t =>
                    (t.Start.HasValue && t.Start.Value >= dayStart && t.Start.Value <= dayEnd) ||
                    (t.End.HasValue && t.End.Value >= dayStart && t.End.Value <= dayEnd)
                ).ToList();

                var dayCompleted = dayTasks.Count(t =>
                {
                    var completedAt = t.CompletedAt ?? t.LastUpdated;
                    return t.Status == TaskStatus.Completed && completedAt.HasValue
                        && completedAt.Value >= dayStart && completedAt.Value <= dayEnd;
                });

                trend.Add(new DailyTrendDto
                {
                    Date = current.ToString("yyyy-MM-dd"),
                    Total = dayTasks.Count,
                    Completed = dayCompleted
                });

                current = current.AddDays(1);
            }

            return trend;
        }

        private int ComputeStreak(List<TaskItem> allTasks, string? timeZone)
        {
            var tz = string.IsNullOrEmpty(timeZone) ? TimeZoneInfo.Utc : TryGetTimeZone(timeZone);
            var today = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz).Date;

            // collect all local dates that have at least one completion
            var completionDates = allTasks
                .Where(t => t.Status == TaskStatus.Completed)
                .Select(t =>
                {
                    var completedAt = t.CompletedAt ?? t.LastUpdated;
                    return completedAt.HasValue
                        ? TimeZoneInfo.ConvertTimeFromUtc(completedAt.Value, tz).Date
                        : (DateTime?)null;
                })
                .Where(d => d.HasValue)
                .Select(d => d!.Value)
                .ToHashSet();

            // walk backwards from today counting consecutive days
            int streak = 0;
            var day = today;
            while (completionDates.Contains(day))
            {
                streak++;
                day = day.AddDays(-1);
            }
            return streak;
        }

        private List<CategoryTimeDto> BuildTimeByCategory(List<TaskItem> tasks)
        {
            return tasks
                .Where(t => t.Start.HasValue && t.End.HasValue)
                .GroupBy(t => string.IsNullOrEmpty(t.Category) ? "other" : t.Category.ToLower())
                .Select(g => new CategoryTimeDto
                {
                    Category = g.Key,
                    AllocatedHours = Math.Round(g.Sum(t => (t.End!.Value - t.Start!.Value).TotalHours), 2),
                    CompletedHours = Math.Round(
                        g.Where(t => t.Status == TaskStatus.Completed)
                         .Sum(t => (t.End!.Value - t.Start!.Value).TotalHours), 2)
                })
                .ToList();
        }

        private TimeZoneInfo TryGetTimeZone(string timeZone)
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(timeZone); }
            catch { return TimeZoneInfo.Utc; }
        }
    }
}
