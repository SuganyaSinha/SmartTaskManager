import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { NewTask, TaskStatus, ScheduledTaskWithNotes, TaskFilter as TaskFilterType } from "../types/common";
import { postUserInput } from "../services/openAiService";
import { getAllTasks, getTasks, updateTask, deleteTask } from "../services/taskService";
import AudioInput, { type AudioInputHandle } from "./AudioInput";
import TaskEditModal from "../components/TaskEditModal";
import TaskFilter from "../components/TaskFilter";
import TaskList from "../components/TaskList";
import TaskCard from "../components/TaskCard";
import "./TaskCalendarView.css";
import "./Home.css";

const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  [TaskStatus.Completed]:  { bg: "#22c55e", border: "#16a34a" },
  [TaskStatus.InProgress]: { bg: "#3b82f6", border: "#2563eb" },
  [TaskStatus.NotStarted]: { bg: "#f59e0b", border: "#d97706" },
  [TaskStatus.Blocked]:    { bg: "#ef4444", border: "#dc2626" },
};

const LEGEND = [
  { label: "Not Started", color: "#f59e0b" },
  { label: "In Progress", color: "#3b82f6" },
  { label: "Completed",   color: "#22c55e" },
  { label: "Blocked",     color: "#ef4444" },
];

const STAT_CARDS = [
  { status: TaskStatus.NotStarted, label: "Not Started", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { status: TaskStatus.InProgress, label: "In Progress", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  { status: TaskStatus.Completed,  label: "Completed",   color: "#22c55e", bg: "#f0fdf4", border: "#bbf7d0" },
  { status: TaskStatus.Blocked,    label: "Blocked",     color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
];

type RightPanel = "overview" | "calendar" | "list";

function Home() {
  const { isAuthenticated, user } = useAuth0();
  const navigate = useNavigate();

  const calendarRef = useRef<FullCalendar>(null);
  const audioInputRef = useRef<AudioInputHandle>(null);

  // Shared tasks (fetched once, updated on schedule/edit/delete)
  const [tasks, setTasks] = useState<NewTask[]>([]);

  // AI scheduling
  const [userInput, setUserInput] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingError, setSchedulingError] = useState<string | null>(null);
  const [schedulingResults, setSchedulingResults] = useState<ScheduledTaskWithNotes[]>([]);

  // Right panel
  const [rightPanel, setRightPanel] = useState<RightPanel>("overview");
  const [overdueExpanded, setOverdueExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);

  // Calendar modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // List panel
  const [listFilters, setListFilters] = useState<TaskFilterType>({});
  const [listTasks, setListTasks] = useState<NewTask[]>([]);

  // Load all tasks on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    getAllTasks()
      .then((data) =>
        setTasks(
          data.map((t) => ({
            ...t,
            start: new Date(t.start),
            end: new Date(t.end),
            status: t.status as TaskStatus,
          }))
        )
      )
      .catch(() => {});
  }, [isAuthenticated]);

  // Reload list tasks when list panel opens or filters change
  useEffect(() => {
    if (rightPanel !== "list") return;
    getTasks(listFilters).then((data) =>
      setListTasks(
        data.map((t) => ({
          ...t,
          start: new Date(t.start),
          end: new Date(t.end),
          status: t.status as TaskStatus,
        }))
      )
    );
  }, [rightPanel, listFilters]);

  // Derived values for overview
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const overdueTasks = useMemo(
    () => tasks.filter((t) => new Date(t.start) < today && t.status !== TaskStatus.Completed),
    [tasks, today]
  );

  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((t) => new Date(t.start) >= today && t.status !== TaskStatus.Completed)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 10),
    [tasks, today]
  );

  const statCounts = useMemo(
    () =>
      STAT_CARDS.reduce((acc, { status }) => {
        acc[status] = tasks.filter((t) => t.status === status).length;
        return acc;
      }, {} as Record<string, number>),
    [tasks]
  );

  // Calendar events derived from tasks
  const fcEvents = useMemo(
    () =>
      tasks.map((task) => {
        const colors = STATUS_COLORS[task.status] ?? { bg: "#6b7280", border: "#4b5563" };
        return {
          id: task.id,
          title: task.title,
          start: task.start,
          end: task.end,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: "#fff",
        };
      }),
    [tasks]
  );

  const selectedTask = useMemo(
    () => tasks.find((e) => e.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  // ── AI scheduling ─────────────────────────────────────────────────────────
  const handleUserSubmit = async () => {
    if (!userInput.trim()) return;
    audioInputRef.current?.stop();
    setIsScheduling(true);
    setSchedulingError(null);
    setSchedulingResults([]);
    try {
      const response = await postUserInput(userInput);
      setSchedulingResults(response);
      setTasks((prev) => [
        ...prev,
        ...response.map((task) => ({
          ...task,
          start: new Date(task.start),
          end: new Date(task.end),
          status: task.status as TaskStatus,
        })),
      ]);
      setUserInput("");
      setRightPanel("calendar");
      setOverdueExpanded(false);
      setUpcomingExpanded(false);
    } catch {
      setSchedulingError("Failed to generate schedule.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleTranscriptChange = useCallback((transcript: string) => {
    setUserInput(transcript);
  }, []);

  // ── Calendar handlers ─────────────────────────────────────────────────────
  const handleEventClick = (info: { event: { id: string } }) => {
    document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    setSelectedTaskId(info.event.id);
    setIsModalOpen(true);
  };

  const handleDateSelect = (info: { start: Date; view: { type: string } }) => {
    if (info.view.type === "dayGridMonth") {
      calendarRef.current?.getApi().changeView("timeGridDay", info.start);
    } else {
      const date = moment(info.start).format("YYYY-MM-DD");
      const time = moment(info.start).format("HH:mm");
      const viewParam = info.view.type === "timeGridWeek" ? "week" : "day";
      navigate(`/newtask?date=${date}&time=${time}&view=${viewParam}`);
    }
  };

  const handleEventDrop = async (info: {
    event: { id: string; start: Date | null; end: Date | null };
    revert: () => void;
  }) => {
    const task = tasks.find((e) => e.id === info.event.id);
    if (!task || !info.event.start) { info.revert(); return; }
    const duration = task.end.getTime() - task.start.getTime();
    const updated: NewTask = {
      ...task,
      start: info.event.start,
      end: info.event.end ?? new Date(info.event.start.getTime() + duration),
    };
    try {
      await updateTask(task.id!, updated);
      setTasks((prev) => prev.map((e) => (e.id === task.id ? updated : e)));
    } catch {
      info.revert();
      setCalendarError("Failed to move task.");
    }
  };

  const handleEventResize = async (info: {
    event: { id: string; start: Date | null; end: Date | null };
    revert: () => void;
  }) => {
    const task = tasks.find((e) => e.id === info.event.id);
    if (!task || !info.event.start || !info.event.end) { info.revert(); return; }
    const updated: NewTask = { ...task, start: info.event.start, end: info.event.end };
    try {
      await updateTask(task.id!, updated);
      setTasks((prev) => prev.map((e) => (e.id === task.id ? updated : e)));
    } catch {
      info.revert();
      setCalendarError("Failed to resize task.");
    }
  };

  const handleUpdateTask = async (updatedTask: NewTask) => {
    if (!selectedTask?.id) return;
    try {
      const apiResponse = await updateTask(selectedTask.id, updatedTask);
      const saved: NewTask = {
        ...apiResponse,
        start: new Date(apiResponse.start),
        end: new Date(apiResponse.end),
        status: apiResponse.status as TaskStatus,
      };
      setTasks((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
      setIsModalOpen(false);
      setSelectedTaskId(null);
    } catch {
      setCalendarError("Failed to update task.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((e) => e.id !== taskId));
      setIsModalOpen(false);
      setSelectedTaskId(null);
    } catch {
      setCalendarError("Failed to delete task.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTaskId(null);
  };

  if (!isAuthenticated) {
    return <div />;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="tcv-root">
      {/* ── Left Panel ── */}
      <aside className="tcv-sidebar">
        <div className="tcv-sidebar-header">
          <span className="tcv-sidebar-title">{greeting}, {firstName}</span>
        </div>

        <div className="tcv-input-section">
          <label className="tcv-label">Describe your tasks</label>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="e.g. Schedule a 2-hour meeting tomorrow at 10am and a code review Friday at 2pm"
            className="tcv-textarea"
          />
        </div>

        <button onClick={handleUserSubmit} disabled={isScheduling} className="tcv-btn-generate">
          {isScheduling ? (
            <>
              <svg className="tcv-spinner" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="15 50" />
              </svg>
              Scheduling…
            </>
          ) : (
            "Generate Schedule"
          )}
        </button>

        <AudioInput ref={audioInputRef} onTranscriptChange={handleTranscriptChange} />

        {schedulingError && (
          <div className="tcv-error">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {schedulingError}
          </div>
        )}

        {schedulingResults.length > 0 && (
          <div className="tcv-scheduling-results">
            <h4 className="tcv-scheduling-results-title">Scheduled</h4>
            {schedulingResults.map((task, i) => (
              <div key={task.id ?? i} className="tcv-scheduling-result-item">
                <div className="tcv-scheduling-result-task-title">
                  {task.id ? (
                    <a href={`/tasks/${task.id}`} className="tcv-scheduling-result-link">{task.title}</a>
                  ) : task.title}
                </div>
                <div className="tcv-scheduling-result-time">
                  {moment(task.start).format("MMM D, h:mm a")} &ndash; {moment(task.end).format("h:mm a")}
                </div>
                {task.isAllocatedOutsideRequestedTime && (
                  <div className="tcv-scheduling-result-note">
                    <span className="tcv-scheduling-result-note-icon">⚠</span>
                    {task.allocationNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Right Panel ── */}
      <main className="tcv-main">
        {/* Tab navigation */}
        <div className="home-tabs">
          {(["overview", "calendar", "list"] as RightPanel[]).map((panel) => (
            <button
              key={panel}
              onClick={() => setRightPanel(panel)}
              className={`home-tab${rightPanel === panel ? " home-tab--active" : ""}`}
            >
              {panel === "overview" ? "Overview" : panel === "calendar" ? "Calendar" : "Task List"}
            </button>
          ))}
        </div>

        {/* Overview */}
        {rightPanel === "overview" && (
          <div className="home-overview">
            <div className="home-stat-grid">
              {STAT_CARDS.map(({ status, label, color, bg, border }) => (
                <div key={status} className="home-stat-card" style={{ background: bg, borderColor: border }}>
                  <span className="home-stat-count" style={{ color }}>{statCounts[status] ?? 0}</span>
                  <span className="home-stat-label">{label}</span>
                </div>
              ))}
            </div>

            <div className="home-section">
              <button className="home-section-header" onClick={() => setOverdueExpanded((v) => !v)}>
                <span className="home-section-title">
                  Overdue
                  {overdueTasks.length > 0 && (
                    <span className="home-section-badge home-section-badge--red">{overdueTasks.length}</span>
                  )}
                </span>
                <span className="home-section-chevron">{overdueExpanded ? "▲" : "▼"}</span>
              </button>
              {overdueExpanded && (
                overdueTasks.length === 0 ? (
                  <p className="home-empty-msg">No overdue tasks.</p>
                ) : (
                  <div className="home-task-list">
                    {overdueTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                  </div>
                )
              )}
            </div>

            <div className="home-section">
              <button className="home-section-header" onClick={() => setUpcomingExpanded((v) => !v)}>
                <span className="home-section-title">
                  Upcoming
                  {upcomingTasks.length > 0 && (
                    <span className="home-section-badge home-section-badge--blue">{upcomingTasks.length}</span>
                  )}
                </span>
                <span className="home-section-chevron">{upcomingExpanded ? "▲" : "▼"}</span>
              </button>
              {upcomingExpanded && (
                upcomingTasks.length === 0 ? (
                  <p className="home-empty-msg">No upcoming tasks.</p>
                ) : (
                  <div className="home-task-list">
                    {upcomingTasks.map((task) => <TaskCard key={task.id} task={task} />)}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Calendar */}
        {rightPanel === "calendar" && (
          <div className="home-calendar-panel">
            {calendarError && (
              <div className="tcv-error" style={{ marginBottom: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {calendarError}
              </div>
            )}
            <div className="tcv-legend">
              {LEGEND.map(({ label, color }) => (
                <div key={label} className="tcv-legend-item">
                  <span className="tcv-legend-dot" style={{ background: color }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="tcv-calendar-wrap">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay",
                }}
                buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
                events={fcEvents}
                editable
                selectable
                selectMirror
                dayMaxEvents={3}
                height="100%"
                nowIndicator
                allDaySlot={false}
                eventDisplay="block"
                slotMinTime="06:00:00"
                slotMaxTime="23:00:00"
                eventClick={handleEventClick}
                select={handleDateSelect}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
              />
            </div>
          </div>
        )}

        {/* Task List */}
        {rightPanel === "list" && (
          <div className="home-list-panel">
            <TaskFilter value={listFilters} onChange={setListFilters} />
            <TaskList tasks={listTasks} />
          </div>
        )}
      </main>

      {isModalOpen && selectedTask && (
        <TaskEditModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          task={selectedTask}
          onSave={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

export default Home;
