import { TaskStatus } from "../types/common";
import { TaskFilter as TaskFilterType} from "../types/common";

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
    const d = new Date(localDateTime);
    return d;
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Title</label>
      <input
        type="text"
        placeholder="Search by title..."
        value={value.title ?? ""}
        onChange={(e) => update({ title: e.target.value })}
      />

      <select
        value={value.status ?? ""}
        onChange={(e) =>
          update({ status: e.target.value as TaskStatus })
        }
      >
        <option value={TaskStatus.NotStarted}>Not Started</option>
        <option value={TaskStatus.InProgress}>In Progress</option>
        <option value={TaskStatus.Completed}>Completed</option>
      </select>

      <input
        type="datetime-local"
        value={toDateTimeLocal(value.start)}
        onChange={(e) => update({ start: formatToUTC(e.target.value) })}
      />

      <input
        type="datetime-local"
        value={toDateTimeLocal(value.end)}
        onChange={(e) => update({ end: formatToUTC(e.target.value) })}
      />
    </div>
  );
};

export default TaskFilter;
