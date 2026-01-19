// pages/TasksPage.tsx
import { useEffect, useState } from "react";
import {NewTask, TaskFilter as TaskFilterType} from "../types/common";
import TaskFilter from "../components/TaskFilter";
import { getTasks } from "../services/taskService";
import { Task } from "../types/common";
import { useAuth0 } from "@auth0/auth0-react";
import TaskList from "../components/TaskList";

const TaskPage = () => {
  const [filters, setFilters] = useState<TaskFilterType>({});
  const [tasks, setTasks] = useState<NewTask[]>([]);
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    getTasks(getAccessTokenSilently,filters).then(setTasks);
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
