// pages/TasksPage.tsx
import { useEffect, useState } from "react";
import {NewTask, TaskFilter as TaskFilterType} from "../types/common";
import TaskFilter from "../components/TaskFilter";
import { getTasks } from "../services/taskService";
import { Task } from "../types/common";
import TaskList from "../components/TaskList";

const TaskPage = () => {
  const [filters, setFilters] = useState<TaskFilterType>({});
  const [tasks, setTasks] = useState<NewTask[]>([]);

  useEffect(() => {
    getTasks(filters).then(setTasks);
  }, [filters]);

  return (
    <>
    <h1>Task Page</h1>
      <TaskFilter value={filters} onChange={setFilters} />
      {/* TaskList component here */}
      <TaskList tasks={tasks} />
    </>
  );
};

export default TaskPage;
