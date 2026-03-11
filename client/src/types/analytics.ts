export interface PriorityStat {
  total: number;
  completed: number;
}

export interface PriorityBreakdown {
  high: PriorityStat;
  medium: PriorityStat;
  low: PriorityStat;
}

export interface DailyTrend {
  date: string; // "yyyy-MM-dd"
  completed: number;
  total: number;
}

export interface CategoryTime {
  category: string;
  allocatedHours: number;
  completedHours: number;
}

export interface ProductivityStats {
  period: string;
  startDate: string;
  endDate: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  onTimeRate: number;
  blockedTasks: number;
  currentStreak: number;
  priorityBreakdown: PriorityBreakdown;
  dailyTrend: DailyTrend[];
  timeByCategory: CategoryTime[];
}
