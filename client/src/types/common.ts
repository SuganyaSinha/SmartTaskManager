
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
  category?: string;
}

export interface ScheduledTaskWithNotes extends NewTask {
  isAllocatedOutsideRequestedTime: boolean;
  allocationNote: string;
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
  priority?: string;
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

// ── Chat types ──────────────────────────────────────────────────────────────

export interface ChatRequest {
  sessionId: string;
  userMessage: string;
  currentDate: string;
  timeZone: string;
  confirmed: boolean;
}

export interface PreviewTask {
  id: string;
  title: string;
  oldStart?: string;
  oldEnd?: string;
  newStart?: string;
  newEnd?: string;
  status?: string;
}

export interface PreviewData {
  affectedCount: number;
  tasks: PreviewTask[];
}

export interface QueryTaskResult {
  id: string;
  title: string;
  start?: string;
  end?: string;
  status: string;
  priority?: string;
}

export interface ChatResponse {
  sessionId: string;
  /** answer | confirmation_required | operation_complete | tasks_created | clarifying_question | error */
  messageType: string;
  message: string;
  previewData?: PreviewData;
  scheduledTasks?: any[];
  queryResults?: QueryTaskResult[];
}

export interface ScheduledTaskResult {
  title: string;
  start: string;
  end: string;
  priority: string;
  comments: string;
  taskCategory?: string;
  isAllocatedOutsideRequestedTime: boolean;
  allocationNote: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  previewData?: PreviewData;
  queryResults?: QueryTaskResult[];
  scheduledTasks?: ScheduledTaskResult[];
  createdTaskIds?: string[];
  messageType?: string;
}

export interface ChatSessionSummary {
  sessionId: string;
  title: string;
  lastActivity: string;
  messageCount: number;
}

export interface SessionMessageDto {
  role: 'user' | 'assistant';
  message: string;
  messageType: string;
  previewData?: PreviewData;
  scheduledTasks?: ScheduledTaskResult[];
  queryResults?: QueryTaskResult[];
}

export interface DashboardSnapshot {
  headline: string;
  detail: string;
  bullets: string[];
  tone: 'urgent' | 'active' | 'calm';
  isAiGenerated: boolean;
}
