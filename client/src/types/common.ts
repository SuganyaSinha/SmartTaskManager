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