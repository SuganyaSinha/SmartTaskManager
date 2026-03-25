import { useState } from "react";
import { TaskStatus } from "../types/common";
import { TaskFilter as TaskFilterType } from "../types/common";

interface TaskFilterProps {
  value: TaskFilterType;
  onChange: (filter: TaskFilterType) => void;
}

const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2);
  const m = i % 2 === 0 ? "00" : "30";
  return `${String(h).padStart(2, "0")}:${m}`;
});

const toDatePart = (date?: Date): string => {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const toTimePart = (date?: Date): string => {
  if (!date) return "00:00";
  const d = new Date(date);
  const h = String(d.getHours()).padStart(2, "0");
  const m = d.getMinutes() >= 30 ? "30" : "00";
  return `${h}:${m}`;
};

const combineDateTime = (datePart: string, timePart: string): Date => {
  return new Date(`${datePart}T${timePart || "00:00"}:00`);
};

const TaskFilter: React.FC<TaskFilterProps> = ({ value, onChange }) => {
  const [expanded, setExpanded] = useState(true);

  const update = (changes: Partial<TaskFilterType>) => {
    onChange({ ...value, ...changes });
  };

  const hasFilters = value.title || value.status || value.start || value.end || value.priority;

  const handleStartDateChange = (datePart: string) => {
    if (!datePart) {
      update({ start: undefined });
    } else {
      const time = value.start ? toTimePart(value.start) : "00:00";
      update({ start: combineDateTime(datePart, time) });
    }
  };

  const handleEndDateChange = (datePart: string) => {
    if (!datePart) {
      update({ end: undefined });
    } else {
      const time = value.end ? toTimePart(value.end) : "00:00";
      update({ end: combineDateTime(datePart, time) });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700"
        >
          Filters
          <span className="text-slate-400 text-[0.6rem] ml-1">{expanded ? "▲" : "▼"}</span>
          {hasFilters && !expanded && (
            <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold">
              ●
            </span>
          )}
        </button>
        {hasFilters && expanded && (
          <button
            onClick={() => onChange({})}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {expanded && <div className="flex flex-col gap-3">
        {/* Row 1: Title, Status, Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              placeholder="Search by title..."
              value={value.title ?? ""}
              onChange={(e) => update({ title: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={value.status ?? ""}
              onChange={(e) =>
                update({ status: e.target.value ? (e.target.value as TaskStatus) : undefined })
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
            >
              <option value={TaskStatus.All}>All Statuses</option>
              <option value={TaskStatus.NotStarted}>Not Started</option>
              <option value={TaskStatus.InProgress}>In Progress</option>
              <option value={TaskStatus.Completed}>Completed</option>
              <option value={TaskStatus.Blocked}>Blocked</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
            <select
              value={value.priority ?? ""}
              onChange={(e) => update({ priority: e.target.value || undefined })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Row 2: From / To with split date + time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={toDatePart(value.start)}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              />
              <select
                value={value.start ? toTimePart(value.start) : "00:00"}
                onChange={(e) => {
                  const date = toDatePart(value.start);
                  if (date) update({ start: combineDateTime(date, e.target.value) });
                }}
                disabled={!value.start}
                className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={toDatePart(value.end)}
                onChange={(e) => handleEndDateChange(e.target.value)}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
              />
              <select
                value={value.end ? toTimePart(value.end) : "00:00"}
                onChange={(e) => {
                  const date = toDatePart(value.end);
                  if (date) update({ end: combineDateTime(date, e.target.value) });
                }}
                disabled={!value.end}
                className="w-24 rounded-md border border-gray-300 px-2 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
};

export default TaskFilter;
