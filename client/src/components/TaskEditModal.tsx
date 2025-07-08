import React, { useState } from 'react';
import { NewTask, TaskPriority } from '../types/common';

interface TaskEditModalProps {
  task: NewTask | null;
  onClose: () => void;
  onSave: (updatedTask: NewTask) => void;
  isOpen: boolean;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, onClose, onSave, isOpen }) => {
  const [editedTask, setEditedTask] = useState<NewTask | null>(task);

  if (!isOpen || !editedTask) return null;

  const handleSave = () => {
    if (editedTask) {
      onSave(editedTask);
      onClose();
    }
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded-lg w-96 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Edit Task</h2>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select
            value={editedTask.priority}
            onChange={(e) => setEditedTask({ ...editedTask, priority: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Comments</label>
          <textarea
            value={editedTask.comments}
            onChange={(e) => setEditedTask({ ...editedTask, comments: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskEditModal;
