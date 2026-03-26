import { useState, useCallback, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useNavigate, useSearchParams } from "react-router-dom";
import moment from "moment";
import { NewTask, TaskStatus } from "../types/common";
import { getTasks, updateTask, deleteTask } from "../services/taskService";
import TaskEditModal from "../components/TaskEditModal";
import "./TaskCalendarView.css";

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

const toFCView = (view: string) => {
  if (view === "week") return "timeGridWeek";
  if (view === "day")  return "timeGridDay";
  return "dayGridMonth";
};

const TaskCalendarView = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get("view") || "month";
  const dateParam = searchParams.get("date");
  const initialDate = dateParam
    ? (() => {
        const [y, m, d] = dateParam.split("-").map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date();

  const calendarRef = useRef<FullCalendar>(null);
  const loadedRangeRef = useRef<string | null>(null);

  const [events, setEvents] = useState<NewTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedTask = useMemo(
    () => events.find((e) => e.id === selectedTaskId) || null,
    [events, selectedTaskId]
  );

  const fcEvents = useMemo(
    () =>
      events.map((task) => {
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
    [events]
  );

  const loadRange = useCallback(async (start: Date, end: Date) => {
    try {
      const response = await getTasks({ start, end });
      setEvents(
        response.map((task) => ({
          ...task,
          start: new Date(task.start),
          end: new Date(task.end),
          status: task.status as TaskStatus,
        }))
      );
    } catch {
      setError("Failed to load tasks.");
    }
  }, []);

  const handleDatesSet = useCallback(
    (info: { start: Date; end: Date }) => {
      const key = `${info.start.getTime()}-${info.end.getTime()}`;
      if (loadedRangeRef.current === key) return;
      loadedRangeRef.current = key;
      loadRange(info.start, info.end);
    },
    [loadRange]
  );

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
    const task = events.find((e) => e.id === info.event.id);
    if (!task || !info.event.start) {
      info.revert();
      return;
    }
    const duration = task.end.getTime() - task.start.getTime();
    const updated: NewTask = {
      ...task,
      start: info.event.start,
      end: info.event.end ?? new Date(info.event.start.getTime() + duration),
    };
    try {
      await updateTask(task.id!, updated);
      setEvents((prev) => prev.map((e) => (e.id === task.id ? updated : e)));
    } catch {
      info.revert();
      setError("Failed to move task.");
    }
  };

  const handleEventResize = async (info: {
    event: { id: string; start: Date | null; end: Date | null };
    revert: () => void;
  }) => {
    const task = events.find((e) => e.id === info.event.id);
    if (!task || !info.event.start || !info.event.end) {
      info.revert();
      return;
    }
    const updated: NewTask = {
      ...task,
      start: info.event.start,
      end: info.event.end,
    };
    try {
      await updateTask(task.id!, updated);
      setEvents((prev) => prev.map((e) => (e.id === task.id ? updated : e)));
    } catch {
      info.revert();
      setError("Failed to resize task.");
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
      setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
      setIsModalOpen(false);
      setSelectedTaskId(null);
    } catch {
      setError("Failed to update task.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setEvents((prev) => prev.filter((e) => e.id !== taskId));
      setIsModalOpen(false);
      setSelectedTaskId(null);
    } catch {
      setError("Failed to delete task.");
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTaskId(null);
  };

  return (
    <div className="tcv-root">
      <main className="tcv-main">
        {error && (
          <div className="tcv-error" style={{ marginBottom: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {error}
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
            initialView={toFCView(initialView)}
            initialDate={initialDate}
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
            datesSet={handleDatesSet}
          />
        </div>
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
};

export default TaskCalendarView;
