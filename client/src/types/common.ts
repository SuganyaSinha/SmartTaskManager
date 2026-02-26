/*export type  Task = {
    name: string;
    category: string;
    time_in_hours: number;
    priority: "high" | "medium" | "low";
  };
  
  export type ApiResponse = {
    timeframe: "day" | "week";
    tasks: Task[];
  };
    */

  export interface Task {
    name: string;
    category: string;
    time_in_hours: number;
    priority: "high" | "medium" | "low";
}

export type TaskPriority = "high" | "medium" | "low";

export enum TaskStatus {
  All = "All",
  NotStarted = "NotStarted",
  InProgress = "InProgress",
  Completed = "Completed",
  Blocked = "Blocked"
}

export interface NewTask {
  id?: string;  // Optional because new tasks won't have an id yet
  title: string;
  start: Date; // ISO 8601 date string, parsed into Date in code
  end: Date;   // ISO 8601 date string, parsed into Date in code
  priority: string;
  comments: string;
  status: TaskStatus;
  timezone?: string;
}

export interface Day {
    overloaded: boolean;
    tasks: Task[];
}

export interface Schedule {
    timeframe: "day" | "week";
    days: {
        [day: string]: Day;
    };
}


export interface UserProfile {
  routine: string;
  personality: string;
}

export interface TaskFilter {
  status?: TaskStatus;
  title?: string;
  start?: Date;
  end?: Date;
  priority?: number;
}

export interface UserRoutine {
  id: string;
  wakeUpTime: string;
  sleepTime: string;
  peakProductivity: string[];
  preferredTaskDuration: number;
  noTaskBefore: string;
  noTaskAfter: string;
  freeTextDescription: string;
}

export interface Constraints {
  noTaskBefore: string;
  noTaskAfter: string;
}

export enum ProductiveHours {
  EarlyMorning = "EarlyMorning",
  Morning = "Morning",
  LateMorning = "LateMorning",
  Afternoon = "Afternoon",
  Evening = "Evening",
  Night = "Night"
}

export interface WorkStyleSettings {
  workHourStart: string;
  workHourEnd: string;
  productiveHours?: ProductiveHours[] | null;
  preferredTaskDuration: number;
}

export interface RoutineProfile {
  id: string;
  wakeUpTime: string;
  sleepTime: string;
  workStyleSettings?: WorkStyleSettings | null;
  constraints?: Constraints | null;
  freeTextDescription: string;
}