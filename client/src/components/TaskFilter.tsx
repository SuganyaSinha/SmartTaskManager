import { TaskStatus } from "../types/common";
import { TaskFilter as TaskFilterType } from "../types/common";

interface TaskFilterProps {
  value: TaskFilterType;
  onChange: (filter: TaskFilterType) => void;
}

const TaskFilter: React.FC<TaskFilterProps> = ({ value, onChange }) => {

  const update = (changes: Partial<TaskFilterType>) => {
    onChange({ ...value, ...changes });
  };

  const toDateTimeLocal = (date?: Date): string => {
    if (!date) return "";
    return new Date(date).toISOString().slice(0, 16);
  };

  const formatToUTC = (localDateTime: string): Date => {
    if (!localDateTime) return new Date();
    return new Date(localDateTime);
  };

  const hasFilters = value.title || value.status || value.start || value.end;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filters</h2>
        {hasFilters && (
          <button
            onClick={() => onChange({})}
            className="text-xs text-blue-500 hover:text-blue-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Title */}
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

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={value.status ?? ""}
            onChange={(e) =>
              update({ status: e.target.value ? (e.target.value as TaskStatus) : undefined })
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            <option value={TaskStatus.NotStarted}>Not Started</option>
            <option value={TaskStatus.InProgress}>In Progress</option>
            <option value={TaskStatus.Completed}>Completed</option>
            <option value={TaskStatus.Blocked}>Blocked</option>
          </select>
        </div>

        {/* From */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="datetime-local"
            value={toDateTimeLocal(value.start)}
            onChange={(e) =>
              update({ start: e.target.value ? formatToUTC(e.target.value) : undefined })
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
          />
        </div>

        {/* To */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="datetime-local"
            value={toDateTimeLocal(value.end)}
            onChange={(e) =>
              update({ end: e.target.value ? formatToUTC(e.target.value) : undefined })
            }
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default TaskFilter;
