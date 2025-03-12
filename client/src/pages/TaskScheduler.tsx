import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import tasksData from "./tasks.json";
import { NewTask } from "../types/common";
import { useAuth0 } from "@auth0/auth0-react";
import { postUserInput } from '../services/StpService';

const localizer = momentLocalizer(moment);

const TaskScheduler = () => {
  const [view, setView] = useState<"day" | "week" | "month" | "work_week" | "agenda">("month");
  const [events, setEvents] = useState<NewTask[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    const formattedEvents = tasksData.map(task => ({
      title: task.title,
      start: new Date(task.start),
      end: new Date(task.end),
      priority: task.priority,
      comments: task.comments,
    }));
    setEvents(formattedEvents);
  }, []);

    // Calculate total hours per day
    const totalHoursPerDay = events.reduce((acc : { [key: string]: number }, event : NewTask) => {
        const day = moment(event.start).format("YYYY-MM-DD");
        const duration =(event.end.getTime() - event.start.getTime())/ (1000 * 60 * 60);
        acc[day] = (acc[day] || 0) + duration;
        return acc;
      }, {});

      const eventStyleGetter = (event : NewTask) => {
        const day = moment(event.start).format("YYYY-MM-DD");
        const totalHours = totalHoursPerDay[day] || 0;
        const backgroundColor = totalHours > 5 ? "#ffcccc" : "blue"; // Light red if overloaded
        return {
          style: { backgroundColor, color: "white" }
        };
      };

      const addTasksFromApi = (apiTasks: NewTask[]) => {
        const formattedApiTasks = apiTasks.map(task => ({
          title: task.title,
          start: new Date(task.start),
          end: new Date(task.end),
          priority: task.priority,
          comments: task.comments,
        }));
      
        //setEvents(prevEvents => [...prevEvents, ...formattedApiTasks]);
        setEvents(prevEvents => {
            const newEvents = [...prevEvents, ...formattedApiTasks];
            console.log("Updated Events:", newEvents); // Debug
            return newEvents;
          });
      };

    // Handle navigation (Next, Back, or clicking a day)
    const handleNavigate = (date: React.SetStateAction<Date>) => {
        setSelectedDate(date);
      };

      const handleUserSubmit = async () => {
        if (!userInput.trim()) return;

        setIsLoading(true);
        setError(null);
        try{
            const response = await postUserInput(userInput, getAccessTokenSilently);
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
        date={selectedDate}
        onNavigate={handleNavigate}
        style={{ width: "100%" }}
        eventPropGetter={eventStyleGetter}
        //key={events.length}
      />
      </div>
    </div>
  );
};

export default TaskScheduler;
