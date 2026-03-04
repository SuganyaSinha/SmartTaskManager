import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { postUserInput } from '../services/openAiService';
import AudioInput, { type AudioInputHandle } from './AudioInput';

function NewTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const audioInputRef = useRef<AudioInputHandle>(null);
  const [userInput, setUserInput] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Initialize date and time from URL parameters
  useEffect(() => {
    const date = searchParams.get('date');
    const time = searchParams.get('time');

    if (date) {
      setTaskDate(date);
    }
    if (time) {
      setTaskTime(time);
    }
  }, [searchParams]);

  const handleCancel = () => {
    const view = searchParams.get('view') || 'month';
    navigate(`/Calendar?view=${view}`);
  };

  // Callback to update userInput with transcript from AudioInput
  const handleTranscriptChange = useCallback((transcript: string) => {
    setUserInput(transcript);
  }, []);

  const handleUserSubmit = async () => {
    if (!userInput.trim()) return;
    audioInputRef.current?.stop();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      let finalInput = userInput;

      // Append date and time to input if provided
      if (taskDate || taskTime) {
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        if (taskDate && taskTime) {
          const dateTimeString = `${taskDate}T${taskTime}`;
          const localDateTime = new Date(dateTimeString);
          const timeString = localDateTime.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: userTimezone
          });
          finalInput += ` - Schedule the task for: ${taskDate} at ${timeString}`;
        } else if (taskDate) {
          finalInput += ` - Schedule the task for: ${taskDate}`;
        } else if (taskTime) {
          const timeString = taskTime;
          finalInput += ` - Schedule the task for: ${timeString}`;
        }
      }

      // Append priority if it's not the default
      if (priority && priority !== 'medium') {
        finalInput += ` - user preferred priority: ${priority}`;
      }

      const response = await postUserInput(finalInput);
      console.log("API Response:", response);
      setSuccess(true);

      // Determine the view and date to redirect to based on the response
      let redirectView = 'month';
      let redirectDate = new Date().toISOString().split('T')[0]; // Default to today

      if (response && response.length > 0) {
        // Extract dates from response tasks (convert from UTC to local date)
        const taskDates = new Set<string>();

        response.forEach((task: any) => {
          const taskStart = new Date(task.start);
          // Convert UTC date to local date string (YYYY-MM-DD)
          const localDate = new Date(taskStart.getTime() - taskStart.getTimezoneOffset() * 60000)
            .toISOString()
            .split('T')[0];
          taskDates.add(localDate);
        });

        const uniqueDates = Array.from(taskDates);

        if (uniqueDates.length === 1) {
          // Single task or all tasks on the same day -> day view
          redirectView = 'day';
          redirectDate = uniqueDates[0];
        } else {
          // Multiple tasks on different days -> week view
          redirectView = 'week';
          redirectDate = uniqueDates[0]; // Use the first task's date
        }
      }

      // Reset form
      setUserInput('');
      setTaskDate('');
      setTaskTime('');
      setPriority('medium');

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate(`/Calendar?view=${redirectView}&date=${redirectDate}`);
      }, 2000);
    } catch (err) {
      console.error('Failed to create task:', err);
      setError("Could not get data. Error in handleSubmit");
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent";
  const labelClass = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="max-w-xl">

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h1>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">

          {/* Task description */}
          <div>
            <label className={labelClass}>Task Description</label>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Describe the task..."
              rows={4}
              className={inputClass}
            />
          </div>

          {/* Voice input */}
          <div>
            <label className={labelClass}>Voice Input</label>
            <AudioInput ref={audioInputRef} onTranscriptChange={handleTranscriptChange} />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Date (Optional)</label>
              <input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Time (Optional)</label>
              <input
                type="time"
                value={taskTime}
                onChange={(e) => setTaskTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className={labelClass}>Priority (Optional)</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className={inputClass}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {/* Error / Success banners */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
              Task created successfully! Redirecting...
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleUserSubmit}
              disabled={isLoading}
              className="px-5 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Task'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-5 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default NewTask;
