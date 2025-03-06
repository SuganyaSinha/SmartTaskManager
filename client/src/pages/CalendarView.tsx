import React from 'react';
import { Day } from '../types/common';

interface CalendarViewProps {
    days: { [day: string]: Day };
    onDayClick: (day: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ days, onDayClick }) => {
    return (
        <div>
            <h2>Weekly Calendar</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {Object.entries(days).map(([day, data]) => (
                    <div
                        key={day}
                        style={{
                            border: '1px solid #ccc',
                            padding: '10px',
                            margin: '10px',
                            cursor: 'pointer',
                            backgroundColor: data.overloaded ? '#ffcccc' : '#ccffcc',
                        }}
                        onClick={() => onDayClick(day)}
                    >
                        <h3>{day}</h3>
                        <p>Tasks: {data.tasks.length}</p>
                        <p>Overloaded: {data.overloaded ? 'Yes' : 'No'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarView;