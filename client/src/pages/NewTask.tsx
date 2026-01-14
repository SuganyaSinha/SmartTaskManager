import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { postUserInput } from '../services/openAiService';
import AudioInput from './AudioInput';

function NewTask() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { getAccessTokenSilently } = useAuth0();

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
          finalInput += ` - user preferred task time: ${taskDate} at ${timeString} (${userTimezone})`;
        } else if (taskDate) {
          finalInput += ` - user preferred task time: ${taskDate}`;
        } else if (taskTime) {
          const timeString = taskTime;
          finalInput += ` - user preferred task time: ${timeString} (${userTimezone})`;
        }
      }

      // Append priority if it's not the default
      if (priority && priority !== 'medium') {
        finalInput += ` - user preferred priority: ${priority}`;
      }

      const response = await postUserInput(finalInput, getAccessTokenSilently);
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

  return (
    <div style={{ width: "100%", padding: "20px", borderRight: "1px solid #ddd", height: "100vh", overflowY: "auto" }}>
      <div style={{ maxWidth: "500px" }}>
        <div style={{ marginBottom: "15px" }}>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter task details..."
            style={{ width: "100%", height: "100px", padding: "10px", borderRadius: "4px", border: "1px solid #ccc" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
          <div>
            <label style={{ display: "block", fontSize: "14px", marginBottom: "5px", color: "#333" }}>
              Date (Optional)
            </label>
            <input
              type="date"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "14px", marginBottom: "5px", color: "#333" }}>
              Time (Optional)
            </label>
            <input
              type="time"
              value={taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", fontSize: "14px", marginBottom: "5px", color: "#333" }}>
            Priority (Optional)
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", boxSizing: "border-box" }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <button
            onClick={handleUserSubmit}
            disabled={isLoading}
            className="mt-2 p-2 bg-blue-500 text-white rounded"
          >
            {isLoading ? 'Loading...' : 'Create New Task'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            style={{ marginLeft: "10px", padding: "8px 16px", borderRadius: "4px", border: "1px solid #ccc", backgroundColor: "#f0f0f0", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>

        <div style={{ marginBottom: "15px" }}>
          <AudioInput onTranscriptChange={handleTranscriptChange} />
        </div>

        {error && <div style={{ color: 'red', marginBottom: "10px" }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: "10px" }}>✓ Task created successfully! Redirecting...</div>}
      </div>
    </div>
  );
}

export default NewTask;