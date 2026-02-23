import React, { useEffect, useState } from 'react';
import { postUserInput } from '../services/openAiService';
import { getUserInformation } from '../services/StpService';
import { Schedule } from '../types/common';
import CalendarView from './CalendarView';
import DayView from './DayView';
import './styles.css';


const TaskManager: React.FC = () => {
    
  const [input, setInput] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const addPromptToHistory = (newPrompt: string) => {
    setPromptHistory((prevHistory) => [...prevHistory, newPrompt]);
    setInput('');
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try{
        const response = await postUserInput(input);
        const test = response;
        //setSchedule(response);
        addPromptToHistory(input);
    }
    catch(err)
    {
        setError("Could not get data.Error in handleSubmit");
    }
    finally{
        setIsLoading(false);
    }

  };

  const handleGet = async () => {

    setIsLoading(true);
    setError(null);
    try{

        const response = await getUserInformation();
        const test = response;
        console.log(test);
        
    }
    catch(err)
    {
        setError("Could not get data.Error in handleSubmit");
    }
    finally{
        setIsLoading(false);
    }

  };

  return (
    <div>
       <div className="flex h-screen">
          {/* Left Panel Start*/}
          <div className="w-1/3 flex flex-col border-r p-4">
          {/* History Panel Start*/}
          {promptHistory.length > 0 && (
            
            <div className="flex-1 overflow-y-auto border-b p-2 h-44">
            <div className="space-y-2">
            {promptHistory.map((item, index) => (
              <div key={index} className="p-2 bg-gray-100 rounded">
                {item}
              </div>
            ))}
          </div>
            </div> 
          )}
          {/*history panel end*/}
            {/* Input Panel start*/}
            <div className="p-2 mt-4">
            <textarea
            className="w-full p-2 border rounded"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your tasks here..."
          />
          <button onClick={handleSubmit} disabled={isLoading} className="w-full mt-2 p-2 bg-blue-500 text-white rounded">
          {isLoading ? 'Loading...' : 'Generate Schedule'}
          </button>

            </div> {/*Input panel end*/}
            <div>
              {error && <div style={{ color: 'red' }}>{error}</div>}
            </div>
          </div> {/*left panel end*/}
          {/* Right Panel start*/}
          <div className="w-2/3 p-4">
            {/*Task panel end*/}
            <div className="space-y-2">
            {schedule && (
        <div>
        {schedule.timeframe === 'week' ? (
            <CalendarView days={schedule.days} onDayClick={setSelectedDay} />
        ) : (
            <DayView day={Object.values(schedule.days)[0]} />
        )}
        {selectedDay && (
            <div>
                <h2>Tasks for {selectedDay}</h2>
                <DayView day={schedule.days[selectedDay]} />
            </div>
        )}
        </div>

      )}

            </div> {/*task panel end*/}
          </div> {/*right panel end*/}
       </div> {/*main div end*/}
       {/* 
        <h1>Schedule Planner</h1>
        <div className="history">
          {promptHistory.length > 0 && (
                        <ul>
                        {promptHistory.map((item, index) => (
                                                  <div key={index} className="mb-3">
                                                  <p className="text-blue-600 font-semibold">{item}</p>
                                                  <hr className="my-2" />
                                              </div>
                          //<li key={index}>{item}</li>
                        ))}
                      </ul>
          )}
        </div>
        <div>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter your tasks here"
                rows={10}
                cols={50}
            />
        </div>
        <div>
            <button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'Generate Schedule'}
            </button>
        </div>
        */}

        

      {/*schedule && (
        <div>
        <h1>Schedule View</h1>
        {schedule.timeframe === 'week' ? (
            <CalendarView days={schedule.days} onDayClick={setSelectedDay} />
        ) : (
            <DayView day={Object.values(schedule.days)[0]} />
        )}
        {selectedDay && (
            <div>
                <h2>Tasks for {selectedDay}</h2>
                <DayView day={schedule.days[selectedDay]} />
            </div>
        )}
        </div>

      )*/}
      </div>
  )
};

export default TaskManager;