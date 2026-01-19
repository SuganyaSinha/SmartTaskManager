import React, { useState } from 'react';
import { NewTask, TaskPriority, TaskStatus } from '../types/common';

interface TaskEditModalProps {
  task: NewTask | null;
  onClose: () => void;
  onSave: (updatedTask: NewTask) => void;
  onDelete?: (taskId: string) => void;
  isOpen: boolean;
}

const TaskEditModal: React.FC<TaskEditModalProps> = ({ task, onClose, onSave, onDelete, isOpen }) => {
  const [editedTask, setEditedTask] = useState<NewTask | null>(task);
  const [timeError, setTimeError] = useState<string>('');

  if (!isOpen || !editedTask) return null;

  // Convert UTC date to local timezone format for datetime-local input
  const formatToLocalDateTime = (date: Date | string): string => {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    // Get local timezone offset in milliseconds
    const offset = d.getTimezoneOffset() * 60000;
    // Adjust date to local time
    const localDate = new Date(d.getTime() - offset);
    // Format as datetime-local expects (YYYY-MM-DDTHH:mm)
    return localDate.toISOString().slice(0, 16);
  };

  // Convert local datetime input back to UTC Date object for storage
  const formatToUTC = (localDateTime: string): Date => {
    if (!localDateTime) return new Date();
    const d = new Date(localDateTime);
    return d;
  };

  const validateTimes = (start?: Date, end?: Date) => {
  if (!start || !end) return '';
  if (new Date(end) <= new Date(start)) {
    return 'End time must be greater than start time';
  }
  return '';
};

  const handleSave = () => {
      if (!editedTask) return;

      const error = validateTimes(editedTask.start, editedTask.end);
      if (error) {
        setTimeError(error);
        return;
      }

      onSave(editedTask);
      onClose();
  };

  const handleDelete = () => {
    if (editedTask?.id && onDelete) {
      onDelete(editedTask.id);
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
              value={formatToLocalDateTime(editedTask.start)}
              onChange={e => {
                const newStart = e.target.value ? formatToUTC(e.target.value) : editedTask.start;
                const error = validateTimes(newStart, editedTask.end);
                setTimeError(error);
                setEditedTask({ ...editedTask, start: newStart });
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>
          
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">End Date/Time</label>
            <input
              type="datetime-local"
              value={formatToLocalDateTime(editedTask.end)}
              onChange={e => {
                const newEnd = e.target.value ? formatToUTC(e.target.value) : editedTask.end;
                const error = validateTimes(editedTask.start, newEnd);
                setTimeError(error);
                setEditedTask({ ...editedTask, end: newEnd });
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            />
          </div>
        </div>
        <div>
{timeError && (
  <p className="text-red-500 text-sm mt-1">{timeError}</p>
)}
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
        <div className="flex justify-between items-center">
          {onDelete && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          )}
          <div className="flex space-x-3">
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
    </div>
  );
};

export default TaskEditModal;
