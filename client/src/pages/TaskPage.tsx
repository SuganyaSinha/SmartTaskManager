// pages/TasksPage.tsx
import { useEffect, useState, useCallback } from "react";
import { NewTask, TaskFilter as TaskFilterType, TaskStatus } from "../types/common";
import TaskFilter from "../components/TaskFilter";
import TaskEditModal from "../components/TaskEditModal";
import { getTasks, updateTask, deleteTask } from "../services/taskService";
import TaskList from "../components/TaskList";

const TaskPage = () => {
  const [filters, setFilters] = useState<TaskFilterType>({});
  const [tasks, setTasks] = useState<NewTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<NewTask | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    getTasks(filters).then(setTasks);
  }, [filters]);

  const handleTaskClick = useCallback((task: NewTask) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  }, []);

  const handleSave = async (updatedTask: NewTask) => {
    if (!selectedTask?.id) return;
    const saved = await updateTask(selectedTask.id, updatedTask);
    const normalized: NewTask = {
      ...saved,
      start: new Date(saved.start),
      end: new Date(saved.end),
      status: saved.status as TaskStatus,
    };
    setTasks((prev) => prev.map((t) => (t.id === normalized.id ? normalized : t)));
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>
        <TaskFilter value={filters} onChange={setFilters} />
        <TaskList tasks={tasks} onTaskClick={handleTaskClick} />
      </div>

      <TaskEditModal
        isOpen={isModalOpen}
        task={selectedTask}
        onClose={handleClose}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default TaskPage;
