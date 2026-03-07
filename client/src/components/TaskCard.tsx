// components/TaskCard.tsx
import { NewTask } from "../types/common";

interface TaskCardProps {
  task: NewTask;
  onClick: (task: NewTask) => void;
}

const statusColorMap: Record<string, string> = {
  NotStarted: "bg-gray-100 text-gray-600",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Blocked: "bg-red-100 text-red-700",
};

const priorityColorMap: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-green-100 text-green-700",
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const startDate = new Date(task.start).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const statusClass = statusColorMap[task.status] ?? "bg-gray-100 text-gray-600";
  const priorityClass = priorityColorMap[task.priority] ?? "bg-gray-100 text-gray-600";
  const priorityLabel = task.priority
    ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
    : "—";

  return (
    <div
      className="border-b last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onClick(task)}
    >

      {/* Mobile layout */}
      <div className="sm:hidden px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-blue-600 font-medium text-sm leading-snug">
            {task.title}
          </span>
          <div className="flex gap-1 flex-shrink-0">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${priorityClass}`}>
              {priorityLabel}
            </span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}>
              {task.status}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400">{startDate}</p>
      </div>

      {/* Desktop layout */}
      <div className="hidden sm:grid sm:grid-cols-12 sm:items-center sm:gap-4 px-4 py-3">
        <div className="col-span-5 truncate">
          <span className="text-blue-600 font-medium">
            {task.title}
          </span>
        </div>
        <div className="col-span-2">
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
            {task.status}
          </span>
        </div>
        <div className="col-span-2">
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${priorityClass}`}>
            {priorityLabel}
          </span>
        </div>
        <div className="col-span-3 text-sm text-gray-500">{startDate}</div>
      </div>

    </div>
  );
};

export default TaskCard;
