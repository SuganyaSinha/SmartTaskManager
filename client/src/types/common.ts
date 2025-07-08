
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

export interface NewTask {
  id?: string;  // Optional because new tasks won't have an id yet
  title: string;
  start: Date; // ISO 8601 date string, parsed into Date in code
  end: Date;   // ISO 8601 date string, parsed into Date in code
  priority: string;
  comments: string;
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