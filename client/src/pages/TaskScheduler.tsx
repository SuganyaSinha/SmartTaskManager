import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import { useNavigate, useSearchParams } from "react-router-dom";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { NewTask, TaskStatus } from "../types/common";
import { postUserInput } from '../services/openAiService';
import { getTasksForTheMonth, updateTask, deleteTask } from '../services/taskService';
import AudioInput from "./AudioInput";
import TaskEditModal from "../components/TaskEditModal";
import './TaskScheduler.css';

const localizer = momentLocalizer(moment);

const TaskScheduler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get('view') as "day" | "week" | "month" | "work_week" | "agenda") || "month";
  const dateParam = searchParams.get('date');
  const initialDate = dateParam
  ? (() => {
      const [year, month, day] = dateParam.split('-').map(Number);
      return new Date(year, month - 1, day); // local midnight
    })()
  : new Date();
  const [view, setView] = useState<"day" | "week" | "month" | "work_week" | "agenda">(initialView);
  const [events, setEvents] = useState<NewTask[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedTask = useMemo(
    () => events.find(e => e.id === selectedTaskId) || null,
    [events, selectedTaskId]
  );

      // Get user tasks for the current month
      const getTasksForTheSelectedMonth = useCallback (async (date : Date) => {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        try{
            const response = await getTasksForTheMonth(year, month);
            console.log("API Response:", response);
            const formattedEvents = response.map(task => ({
              id: task.id,
              title: task.title,
              start: new Date(task.start),
              end: new Date(task.end),
              priority: task.priority,
              comments: task.comments,
              status: task.status as TaskStatus,
            }));
              setEvents(formattedEvents);
        }
        catch(err)
        {
            setError("Could not get data.Error in getTasksForTheSelectedMonth");
        }
        finally{

        }
      },[]);

  // Fetch tasks when the component mounts
  useEffect(() => {
    getTasksForTheSelectedMonth(currentDate);
  }, [getTasksForTheSelectedMonth, currentDate]);



    // Calculate total hours per day
    const totalHoursPerDay = events.reduce((acc : { [key: string]: number }, event : NewTask) => {
        const day = moment(event.start).format("YYYY-MM-DD");
        const duration =(event.end.getTime() - event.start.getTime())/ (1000 * 60 * 60);
        acc[day] = (acc[day] || 0) + duration;
        return acc;
      }, {});

      const getStatusColor = (status: TaskStatus) => {
        switch (status) {
          case TaskStatus.Completed:
            return "#90EE90"; // Light green
          case TaskStatus.InProgress:
            return "#87CEEB"; // Sky blue
          case TaskStatus.NotStarted:
            return "#FFE4B5"; // Moccasin (light peach)
          case TaskStatus.Blocked:
            return "#FFB6C1"; // Light pink
          default:
            return "#D3D3D3"; // Light gray
        }
      };

      const eventStyleGetter = (event : NewTask) => {
        //const day = moment(event.start).format("YYYY-MM-DD");
        //const totalHours = totalHoursPerDay[day] || 0;
        //const backgroundColor = totalHours > 5 ? "#ffcccc" : "blue"; // Light red if overloaded
        const backgroundColor = getStatusColor(event.status);
        return {
          style: { backgroundColor, color: "#333" }
        };
      };

      const addTasksFromApi = (apiTasks: NewTask[]) => {
        const formattedApiTasks = apiTasks.map(task => ({
          id: task.id,
          title: task.title,
          start: new Date(task.start),
          end: new Date(task.end),
          priority: task.priority,
          comments: task.comments,
          status: task.status as TaskStatus,
        }));
      
        setEvents(prevEvents => {
            const newEvents = [...prevEvents, ...formattedApiTasks];
            console.log("Updated Events:", newEvents); // Debug
            return newEvents;
          });
      };

    // Handle navigation (Next, Back, or clicking a day)
    const handleNavigate = (date: React.SetStateAction<Date>) => {
        setCurrentDate(date);
      };

  const handleSelectEvent = (event: NewTask) => {
    setSelectedTaskId(event.id ?? null);
    setIsModalOpen(true);
  };

  const handleUpdateTask = async (updatedTask: NewTask) => {
    try {
      if (!selectedTask?.id) {
        throw new Error('Task ID is missing');
      }
      const apiResponse = await updateTask(selectedTask.id, updatedTask);
      // Update local state using the response from the API and match by id
      const updatedEvent: NewTask = {
        ...apiResponse,
        start: new Date(apiResponse.start),
        end: new Date(apiResponse.end),
        status: apiResponse.status as TaskStatus,
      };

            setEvents(prev =>
        prev.map(event =>
          event.id === updatedEvent.id ? updatedEvent : event
        )
      );

      setIsModalOpen(false);
      setSelectedTaskId(null);
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTaskId(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await deleteTask(taskId);
      console.log("API Response for deleting task:", response);
      setEvents(prev => prev.filter(event => event.id !== taskId));
      setIsModalOpen(false);
      setSelectedTaskId(null);
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Failed to delete task. Please try again.');
    }
  };

      const handleUserSubmit = async () => {
        if (!userInput.trim()) return;

        setIsLoading(true);
        setError(null);
        try{
            const response = await postUserInput(userInput);
            const test = response;
            console.log("API Response:", response);
            addTasksFromApi(response);
        }
        catch(err)
        {
            setError("Could not get data.Error in handleSubmit");
        }
        finally{
            setIsLoading(false);
        }
      }

      // Callback to update userInput with transcript from AudioInput
      const handleTranscriptChange = useCallback((transcript: string) => {
        setUserInput(transcript);
      }, []);


   return (
    <div style={{ display: "flex", height: "100vh" }}>
      <div style={{ width: "20%", padding: "20px", borderRight: "1px solid #ddd" }}>
        <div>
            <textarea 
            value={userInput} 
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter task details..."
            style={{ width: "100%", height: "100px", padding: "10px" }}
            />
        </div>
        <div>
             <button onClick={handleUserSubmit} disabled={isLoading} className="w-full mt-2 p-2 bg-blue-500 text-white rounded">{isLoading ? 'Loading...' : 'Generate Schedule'}</button>
        </div>
        <div>
          <AudioInput onTranscriptChange={handleTranscriptChange} />
        </div>
        <div>
              {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>

      </div>
      <div style={{ width: "80%" }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          views={["month", "week", "day"]}
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={handleNavigate}
          style={{ width: "100%" }}
          eventPropGetter={eventStyleGetter}
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={(slotInfo) => {
            if (view === "month") {
              setCurrentDate(slotInfo.start);
              setView("day");
            } else if (view === "week" || view === "day") {
              const selectedDate = moment(slotInfo.start).format("YYYY-MM-DD");
              const selectedTime = moment(slotInfo.start).format("HH:mm");
              navigate(`/newtask?date=${selectedDate}&time=${selectedTime}&view=${view}`);
            }
          }}
        />
      </div>
      {isModalOpen && selectedTask && (
        <TaskEditModal 
          isOpen={isModalOpen} 
          onClose={handleCloseModal} 
          task={selectedTask} 
          onSave={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
};

export default TaskScheduler;
