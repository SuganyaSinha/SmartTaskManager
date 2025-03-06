import React from 'react';
import { Day } from '../types/common.ts';

interface DayViewProps {
    day: Day;
}

const DayView: React.FC<DayViewProps> = ({ day }) => {
    return (
        <div>
            <h3>Tasks</h3>
            <ul>
                {day.tasks.map((task, index) => (
                    <li key={index}>
                        <strong>{task.name}</strong>  - {task.time_in_hours} hours 
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default DayView;