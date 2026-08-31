import { useState, useEffect, useCallback, useMemo, type CSSProperties } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import moment from "moment";
import { NewTask, TaskStatus } from "../types/common";
import { getAllTasks, updateTask, deleteTask } from "../services/taskService";
import { getDashboardSnapshot } from "../services/dashboardService";
import { DashboardSnapshot } from "../types/common";
import TaskEditModal from "../components/TaskEditModal";
import TaskCard from "../components/TaskCard";
import "./Home.css";
import Landing from "./Landing";

const STAT_CARDS = [
  { status: TaskStatus.NotStarted, label: "Not Started", color: "#f59e0b" },
  { status: TaskStatus.InProgress, label: "In Progress", color: "#3b82f6" },
  { status: TaskStatus.Completed, label: "Completed", color: "#22c55e" },
  { status: TaskStatus.Blocked, label: "Blocked", color: "#ef4444" },
];

// Feature flag: toggle the AI Snapshot briefing on the dashboard.
const SHOW_AI_SNAPSHOT = true;

function Home() {
  const { isAuthenticated } = useAuth0();

  const [tasks, setTasks] = useState<NewTask[]>([]);
  const [overdueExpanded, setOverdueExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiSnapshot, setAiSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTaskClick = useCallback((task: NewTask) => {
    setSelectedTaskId(task.id!);
    setIsModalOpen(true);
  }, []);

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
      .catch(() => setError("Could not load your task overview."));
  }, [isAuthenticated]);

  const loadAiSnapshot = useCallback(async () => {
    if (!isAuthenticated || !SHOW_AI_SNAPSHOT) return;

    setIsSnapshotLoading(true);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const snapshot = await getDashboardSnapshot(timeZone);
      setAiSnapshot(snapshot);
    } catch {
      setError("Could not load your AI snapshot.");
    } finally {
      setIsSnapshotLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAiSnapshot();
  }, [loadAiSnapshot]);

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

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => new Date(t.start).toDateString() === new Date().toDateString())
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [tasks]
  );

  const pendingTodayTasks = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            new Date(t.start).toDateString() === new Date().toDateString() &&
            t.status === TaskStatus.NotStarted
        )
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [tasks]
  );

  const statCounts = useMemo(
    () =>
      STAT_CARDS.reduce((acc, { status }) => {
        acc[status] = tasks.filter((t) => t.status === status).length;
        return acc;
      }, {} as Record<string, number>),
    [tasks]
  );

  const completedCount = statCounts[TaskStatus.Completed] ?? 0;
  const inProgressCount = statCounts[TaskStatus.InProgress] ?? 0;
  const notStartedCount = statCounts[TaskStatus.NotStarted] ?? 0;
  const blockedCount = statCounts[TaskStatus.Blocked] ?? 0;
  const completionRate = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const openCount = Math.max(0, tasks.length - completedCount);
  const statusSegments = STAT_CARDS.map(({ status, label, color }) => {
    const count = statCounts[status] ?? 0;
    const width = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
    return { status, label, color, count, width };
  });
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

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
      setTasks((prev) => prev.map((task) => (task.id === saved.id ? saved : task)));
      loadAiSnapshot();
      setIsModalOpen(false);
      setSelectedTaskId(null);
    } catch {
      setError("Failed to update task.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      loadAiSnapshot();
      setIsModalOpen(false);
      setSelectedTaskId(null);
    } catch {
      setError("Failed to delete task.");
    }
  };

  if (!isAuthenticated) {
    return <Landing />;
  }

  const snapshotBullets =
    aiSnapshot?.bullets ?? ["Do first: analyze overdue work", "Then: check upcoming deadlines", "Watch: find schedule risk"];

  return (
    <div className="home-workspace">
      <main className="home-main-stage">
        <div className="home-overview">
          {error && <div className="home-alert">{error}</div>}

          {SHOW_AI_SNAPSHOT && (
          <section className={`home-ai-snapshot home-ai-snapshot--${aiSnapshot?.tone ?? "active"}`}>
            <div className="home-ai-hero-row">
              <div className="home-ai-mark" aria-hidden="true">AI</div>
              <div className="home-ai-copy">
                <span className="home-kicker">
                  AI Snapshot
                  {aiSnapshot && !aiSnapshot.isAiGenerated && <em>Fallback</em>}
                </span>
                <h3>{isSnapshotLoading ? "Reading your task queue..." : aiSnapshot?.headline ?? "AI snapshot is preparing."}</h3>
                <p>
                  {isSnapshotLoading
                    ? "Reviewing overdue, blocked, high-priority, and upcoming work."
                    : aiSnapshot?.detail ?? "Your personalized dashboard briefing will appear here shortly."}
                </p>
              </div>
            </div>
            <ol className="home-ai-snapshot-list">
              {snapshotBullets.map((item) => (
                <li key={item}>
                  {item.includes(":") ? (
                    <>
                      <strong>{item.split(":")[0]}</strong>
                      <span>{item.slice(item.indexOf(":") + 1).trim()}</span>
                    </>
                  ) : (
                    <span>{item}</span>
                  )}
                </li>
              ))}
            </ol>
          </section>
          )}

          <section className="home-command-strip">
            <div className="home-completion-orbit">
              <div
                className="home-completion-ring"
                style={{ "--completion-offset": `${100 - completionRate}` } as CSSProperties}
              >
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle className="home-completion-track" cx="60" cy="60" r="48" pathLength="100" />
                  <circle className="home-completion-progress" cx="60" cy="60" r="48" pathLength="100" />
                </svg>
                <span>{completionRate}%</span>
              </div>
              <div>
                <span className="home-metric-label">Completion</span>
                <strong>{completedCount}/{tasks.length || 0}</strong>
                <p>{openCount} open task{openCount === 1 ? "" : "s"} remaining</p>
              </div>
            </div>

            <div className="home-status-visual">
              <div className="home-status-visual-header">
                <span className="home-metric-label">Task Distribution</span>
                <strong>{tasks.length}</strong>
              </div>
              <div className="home-status-beam" aria-label="Task status distribution">
                {statusSegments.map(({ status, color, width }) => (
                  <span
                    key={status}
                    style={{ width: `${Math.max(width, width > 0 ? 4 : 0)}%`, background: color }}
                  />
                ))}
              </div>
              <div className="home-status-legend">
                {statusSegments.map(({ status, label, color, count }) => (
                  <span key={status}>
                    <i style={{ background: color }} />
                    {label} <strong>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="home-overview-grid">
            <section className="home-section home-section--upcoming">
              <button className="home-section-header" onClick={() => setUpcomingExpanded((v) => !v)}>
                <span className="home-section-title">
                  Upcoming
                  {upcomingTasks.length > 0 && <span className="home-section-badge home-section-badge--blue">{upcomingTasks.length}</span>}
                </span>
                <span className="home-section-chevron">{upcomingExpanded ? "Open" : "Closed"}</span>
              </button>
              {upcomingExpanded && (
                upcomingTasks.length === 0 ? (
                  <p className="home-empty-msg">No upcoming tasks.</p>
                ) : (
                  <div className="home-task-list">
                    {upcomingTasks.map((task) => <TaskCard key={task.id} task={task} onClick={handleTaskClick} />)}
                  </div>
                )
              )}
            </section>

            <section className="home-section home-section--overdue">
              <button className="home-section-header" onClick={() => setOverdueExpanded((v) => !v)}>
                <span className="home-section-title">
                  Overdue
                  {overdueTasks.length > 0 && <span className="home-section-badge home-section-badge--red">{overdueTasks.length}</span>}
                </span>
                <span className="home-section-chevron">{overdueExpanded ? "Open" : "Closed"}</span>
              </button>
              {overdueExpanded && (
                overdueTasks.length === 0 ? (
                  <p className="home-empty-msg">No overdue tasks.</p>
                ) : (
                  <div className="home-task-list">
                    {overdueTasks.map((task) => <TaskCard key={task.id} task={task} onClick={handleTaskClick} />)}
                  </div>
                )
              )}
            </section>
          </div>
        </div>
      </main>

      <aside className="home-insight-rail">
        <section className="home-focus-card">
          <span className="home-kicker">Today</span>
          <strong>{todayTasks.length}</strong>
          <p>{todayTasks.length === 1 ? "task scheduled" : "tasks scheduled"}</p>
        </section>

        <section className="home-rail-section">
          <h2>To Do Today</h2>
          {pendingTodayTasks.length === 0 ? (
            <p className="home-empty-msg">No pending tasks for today.</p>
          ) : (
            <div className="home-rail-list">
              {pendingTodayTasks.slice(0, 5).map((task) => (
                <button key={task.id} className="home-rail-task" onClick={() => handleTaskClick(task)}>
                  <span>{moment(task.start).format("h:mm a")}</span>
                  <strong>{task.title}</strong>
                </button>
              ))}
            </div>
          )}
        </section>
      </aside>

      {isModalOpen && selectedTask && (
        <TaskEditModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTaskId(null);
          }}
          task={selectedTask}
          onSave={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

export default Home;
