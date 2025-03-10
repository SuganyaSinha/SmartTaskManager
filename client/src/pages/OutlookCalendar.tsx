import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";


const OutlookCalendar = () => {
  const [events, setEvents] = useState([
    { title: "Team Meeting", date: "2025-03-10T09:00:00", duration: 2 },
    { title: "Design Review", date: "2025-03-12T10:00:00", duration: 3 },
    { title: "All-Hands", date: "2025-03-15T09:00:00", duration: 4 },
    { title: "Code Review", date: "2025-03-15T11:00:00", duration: 2 }, // This makes March 15 > 5 hours
  ]);

  const [currentView, setCurrentView] = useState("dayGridMonth");
  const [selectedDate, setSelectedDate] = useState("");
  const [showDayView, setShowDayView] = useState(false);

  // Handle clicking on a day to show its tasks
  const handleDateClick = (info: any) => {
    setSelectedDate(info.dateStr);
    setShowDayView(true);
  };

  // Compute overloaded days (total duration > 5 hours)
  const computeOverloadedDays = () => {
    const durationMap: Record<string, number> = {};
    events.forEach((event) => {
      const date = event.date.split("T")[0];
      durationMap[date] = (durationMap[date] || 0) + event.duration;
    });
    return durationMap;
  };

  const overloadedDays = computeOverloadedDays();

  return (
    <div className="flex flex-col items-center p-6 bg-gray-100 min-h-screen">
      {/* Header */}
      <h1 className="text-3xl font-bold mb-2">My Schedule</h1>
      <h2 className="text-xl text-gray-700 mb-4">March 2025</h2>

      {/* Calendar View */}
      {!showDayView && (
        <div className="w-full max-w-4xl bg-white p-4 rounded-lg shadow-md">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            events={events}
            dateClick={handleDateClick}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height={550}
            dayCellDidMount={(info) => {
              const date = info.date.toISOString().split("T")[0];
              if (overloadedDays[date] && overloadedDays[date] > 5) {
                info.el.style.backgroundColor = "rgba(255, 0, 0, 0.3)"; // Red highlight
              }
            }}
          />
        </div>
      )}

      {/* Day View - Task List */}
      {showDayView && (
  <div className="w-full max-w-4xl bg-white p-4 rounded-lg shadow-md min-h-[550px] flex flex-col">
  <h2 className="text-xl font-semibold mb-4">Tasks for {selectedDate}</h2>

  <div className="flex-1 overflow-y-auto">
    <ul>
      {events.filter((e) => e.date.startsWith(selectedDate)).length > 0 ? (
        events
          .filter((e) => e.date.startsWith(selectedDate))
          .map((event, index) => (
            <li key={index} className="p-2 border-b">
              {event.title} ({event.duration} hrs)
            </li>
          ))
      ) : (
        <p className="text-gray-500">No tasks scheduled.</p>
      )}
    </ul>
  </div>
          <button
      className="mt-4 w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
      onClick={() => setShowDayView(false)}
    >
      Back to Calendar
    </button>
        </div>
      )}
    </div>
  );
};

export default OutlookCalendar;
