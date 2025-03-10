import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import tasksData from "./tasks.json";
import { NewTask } from "../types/common";

const localizer = momentLocalizer(moment);

const TaskScheduler = () => {
  const [view, setView] = useState<"day" | "week" | "month" | "work_week" | "agenda">("month");
  const [events, setEvents] = useState<NewTask[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

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

    // Handle navigation (Next, Back, or clicking a day)
    const handleNavigate = (date: React.SetStateAction<Date>) => {
        setSelectedDate(date);
      };

  return (
    <div style={{ height: "100vh" }}>
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
      />
    </div>
  );
};

export default TaskScheduler;
