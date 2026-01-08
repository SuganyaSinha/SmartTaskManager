import React, { useState } from 'react';
import { NewTask, TaskPriority, TaskStatus } from '../types/common';

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
      <div className="bg-white p-6 rounded-lg w-[540px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4">Edit Task</h2>
        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={editedTask.title}
            onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          />
        </div>
        {/* Priority */}
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
        {/* Status */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={editedTask.status}
            onChange={e => setEditedTask({ ...editedTask, status: e.target.value as TaskStatus })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
          >
            {Object.values(TaskStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        {/* Start Date/Time */}
        <style>
          {`
          input[type="datetime-local"]::-webkit-clear-button,
          input[type="datetime-local"]::-ms-clear {
            display: none;
          }
          input[type="datetime-local"]::-webkit-inner-spin-button {
            margin-right: 0;
          }
          `}
        </style>
        <div className="mb-4 flex gap-4">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Start Date/Time</label>
            <input
              type="datetime-local"
              value={
                editedTask.start && !isNaN(new Date(editedTask.start).getTime())
                  ? new Date(editedTask.start).toISOString().slice(0, 16)
                  : ''
              }
              onChange={e => {
                setEditedTask({ ...editedTask, start: e.target.value ? new Date(e.target.value) : editedTask.start });
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">End Date/Time</label>
            <input
              type="datetime-local"
              value={
                editedTask.end && !isNaN(new Date(editedTask.end).getTime())
                  ? new Date(editedTask.end).toISOString().slice(0, 16)
                  : ''
              }
              onChange={e => {
                setEditedTask({ ...editedTask, end: e.target.value ? new Date(e.target.value) : editedTask.end });
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>
        </div>
        {/* Comments */}
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
