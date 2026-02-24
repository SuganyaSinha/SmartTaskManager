import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { NewTask, TaskStatus } from '../types/common';
import { getTaskById, updateTask, deleteTask } from '../services/taskService';

const statusColorMap: Record<string, string> = {
  NotStarted: 'bg-gray-100 text-gray-700',
  InProgress:  'bg-blue-100 text-blue-700',
  Completed:   'bg-green-100 text-green-700',
  Blocked:     'bg-red-100 text-red-700',
};

const priorityColorMap: Record<string, string> = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-green-100 text-green-700',
};

// Convert UTC date to local timezone format for datetime-local input
const formatToLocalDateTime = (date: Date | string): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const offset = d.getTimezoneOffset() * 60000;
  const localDate = new Date(d.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
};

// Convert local datetime input back to UTC Date object
const formatToUTC = (localDateTime: string): Date => {
  if (!localDateTime) return new Date();
  return new Date(localDateTime);
};

const validateTimes = (start?: Date, end?: Date): string => {
  if (!start || !end) return '';
  if (new Date(end) <= new Date(start)) return 'End time must be after start time';
  return '';
};

const formatDisplayDate = (date: Date | string): string => {
  return new Date(date).toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TaskDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [task, setTask] = useState<NewTask | null>(null);
  const [editedTask, setEditedTask] = useState<NewTask | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeError, setTimeError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getTaskById(id)
      .then((data) => { setTask(data); setError(null); })
      .catch(() => setError('Could not load task. Please go back and try again.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleEdit = () => {
    if (!task) return;
    setEditedTask({ ...task });
    setTimeError('');
    setShowDeleteConfirm(false);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditedTask(null);
    setTimeError('');
    setShowDeleteConfirm(false);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editedTask || !id) return;
    const err = validateTimes(editedTask.start, editedTask.end);
    if (err) { setTimeError(err); return; }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateTask(id, editedTask);
      setTask(updated?.id ? updated : editedTask);
      setIsEditing(false);
      setEditedTask(null);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteTask(id);
      navigate('/Task');
    } catch {
      setError('Failed to delete. Please try again.');
      setShowDeleteConfirm(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-500 text-sm">Loading task...</p>
      </div>
    );
  }

  // Fatal error — task could not be loaded
  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 gap-4">
        <p className="text-red-600">{error ?? 'Task not found.'}</p>
        <button
          onClick={() => navigate('/Task')}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">

          {/* ── Header ── */}
          <div className="px-6 py-4 border-b flex items-start gap-3">
            <button
              onClick={() => navigate(-1)}
              className="mt-1 flex-shrink-0 text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              ← Back
            </button>
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editedTask!.title}
                  onChange={(e) =>
                    setEditedTask({ ...editedTask!, title: e.target.value })
                  }
                  className="w-full text-xl font-bold rounded-md border-gray-300 shadow-sm p-2 border"
                />
              ) : (
                <h1 className="text-xl font-bold text-gray-900 break-words">
                  {task.title}
                </h1>
              )}
            </div>
            <span
              className={`flex-shrink-0 inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${statusColorMap[task.status] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {task.status}
            </span>
          </div>

          {/* ── Body ── */}
          <div className="px-6 py-5 space-y-5">

            {/* Error banner */}
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Priority */}
            <div>
              {isEditing ? (
                <>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <select
                    value={editedTask!.priority}
                    onChange={(e) =>
                      setEditedTask({ ...editedTask!, priority: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Priority</p>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${priorityColorMap[task.priority] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                  </span>
                </>
              )}
            </div>

            {/* Status — only shown as editable in edit mode; view mode shows it in the header */}
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={editedTask!.status}
                  onChange={(e) =>
                    setEditedTask({ ...editedTask!, status: e.target.value as TaskStatus })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                >
                  {Object.values(TaskStatus).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Start / End dates */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                {isEditing ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700">Start Date/Time</label>
                    <input
                      type="datetime-local"
                      value={formatToLocalDateTime(editedTask!.start)}
                      onChange={(e) => {
                        const newStart = e.target.value
                          ? formatToUTC(e.target.value)
                          : editedTask!.start;
                        setTimeError(validateTimes(newStart, editedTask!.end));
                        setEditedTask({ ...editedTask!, start: newStart });
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start</p>
                    <p className="mt-1 text-sm text-gray-800">{formatDisplayDate(task.start)}</p>
                  </>
                )}
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <>
                    <label className="block text-sm font-medium text-gray-700">End Date/Time</label>
                    <input
                      type="datetime-local"
                      value={formatToLocalDateTime(editedTask!.end)}
                      onChange={(e) => {
                        const newEnd = e.target.value
                          ? formatToUTC(e.target.value)
                          : editedTask!.end;
                        setTimeError(validateTimes(editedTask!.start, newEnd));
                        setEditedTask({ ...editedTask!, end: newEnd });
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">End</p>
                    <p className="mt-1 text-sm text-gray-800">{formatDisplayDate(task.end)}</p>
                  </>
                )}
              </div>
            </div>

            {/* Time validation error */}
            {timeError && (
              <p className="text-red-500 text-sm">{timeError}</p>
            )}

            {/* Comments */}
            <div>
              {isEditing ? (
                <>
                  <label className="block text-sm font-medium text-gray-700">Comments</label>
                  <textarea
                    value={editedTask!.comments}
                    onChange={(e) =>
                      setEditedTask({ ...editedTask!, comments: e.target.value })
                    }
                    rows={4}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                  />
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Comments</p>
                  {task.comments ? (
                    <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{task.comments}</p>
                  ) : (
                    <p className="mt-1 text-sm text-gray-400 italic">No comments</p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-4 border-t bg-gray-50">
            {!isEditing ? (
              <div className="flex justify-end">
                <button
                  onClick={handleEdit}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit
                </button>
              </div>
            ) : showDeleteConfirm ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex-1 text-sm text-red-600">
                  Are you sure? This cannot be undone.
                </span>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Confirm Delete
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-between items-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
