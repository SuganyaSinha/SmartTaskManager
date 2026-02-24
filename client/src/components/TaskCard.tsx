// components/TaskCard.tsx
import { Link } from 'react-router-dom';
import { NewTask } from "../types/common";

interface TaskCardProps {
  task: NewTask;
}

const statusColorMap: Record<string, string> = {
  NotStarted: "bg-gray-100 text-gray-700",
  InProgress: "bg-blue-100 text-blue-700",
  Completed: "bg-green-100 text-green-700",
  Blocked: "bg-red-100 text-red-700",
};

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  return (
    <div className="grid grid-cols-12 items-center gap-4 px-4 py-3 border-b hover:bg-gray-50">
      {/* Title */}
      <div className="col-span-6 truncate">
        <Link
          to={`/tasks/${task.id}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {task.title}
        </Link>
      </div>

      {/* Status */}
      <div className="col-span-3">
        <span
          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
            statusColorMap[task.status]
          }`}
        >
          {task.status}
        </span>
      </div>

      {/* Start Date */}
      <div className="col-span-3 text-sm text-gray-600">
        {new Date(task.start).toLocaleDateString()}
      </div>
    </div>
  );
};

export default TaskCard;