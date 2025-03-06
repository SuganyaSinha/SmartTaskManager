
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