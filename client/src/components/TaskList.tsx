// components/TaskList.tsx
import { NewTask } from "../types/common";
import TaskCard from "./TaskCard";


interface TaskListProps {
  tasks: NewTask[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
 if (tasks.length === 0) {
    return (
      <div className="p-4 text-gray-500 text-sm">
        No tasks found.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-100 text-sm font-semibold text-gray-600">
        <div className="col-span-6">Title</div>
        <div className="col-span-3">Status</div>
        <div className="col-span-3">Start Date</div>
      </div>

      {/* Rows */}
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
};

export default TaskList;
