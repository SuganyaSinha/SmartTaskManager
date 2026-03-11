namespace SmartTaskManager.Models.DTO
{
    public class ProductivityStatsDto
    {
        public string Period { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
        public double CompletionRate { get; set; }
        public double OnTimeRate { get; set; }
        public int BlockedTasks { get; set; }
        public int CurrentStreak { get; set; }
        public PriorityBreakdownDto PriorityBreakdown { get; set; } = new();
        public List<DailyTrendDto> DailyTrend { get; set; } = new();
        public List<CategoryTimeDto> TimeByCategory { get; set; } = new();
    }

    public class PriorityBreakdownDto
    {
        public PriorityStatDto High { get; set; } = new();
        public PriorityStatDto Medium { get; set; } = new();
        public PriorityStatDto Low { get; set; } = new();
    }

    public class PriorityStatDto
    {
        public int Total { get; set; }
        public int Completed { get; set; }
    }

    public class DailyTrendDto
    {
        public string Date { get; set; } = string.Empty;
        public int Completed { get; set; }
        public int Total { get; set; }
    }

    public class CategoryTimeDto
    {
        public string Category { get; set; } = string.Empty;
        public double AllocatedHours { get; set; }
        public double CompletedHours { get; set; }
    }
}
