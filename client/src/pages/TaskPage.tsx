// pages/TasksPage.tsx
import { useEffect, useState } from "react";
import { NewTask, TaskFilter as TaskFilterType } from "../types/common";
import TaskFilter from "../components/TaskFilter";
import { getTasks } from "../services/taskService";
import TaskList from "../components/TaskList";

const TaskPage = () => {
  const [filters, setFilters] = useState<TaskFilterType>({});
  const [tasks, setTasks] = useState<NewTask[]>([]);

  useEffect(() => {
    getTasks(filters).then(setTasks);
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>
        <TaskFilter value={filters} onChange={setFilters} />
        <TaskList tasks={tasks} />
      </div>
    </div>
  );
};

export default TaskPage;
