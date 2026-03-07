// components/TaskList.tsx
import { NewTask } from "../types/common";
import TaskCard from "./TaskCard";

interface TaskListProps {
  tasks: NewTask[];
  onTaskClick: (task: NewTask) => void;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onTaskClick }) => {
  if (tasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-6 py-12 text-center">
        <p className="text-gray-400 text-sm">No tasks found.</p>
        <p className="text-gray-300 text-xs mt-1">Try adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Column headers — desktop only */}
      <div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 px-4 py-2.5 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wide">
        <div className="col-span-5">Title</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Priority</div>
        <div className="col-span-3">Start Date</div>
      </div>

      {tasks.map(task => (
        <TaskCard key={task.id} task={task} onClick={onTaskClick} />
      ))}
    </div>
  );
};

export default TaskList;
