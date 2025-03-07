import React, { useEffect, useState } from 'react';
import { postUserInput } from '../services/StpService';
import { getUserInformation } from '../services/StpService';
import { Schedule } from '../types/common';
import CalendarView from './CalendarView';
import DayView from './DayView';
import './styles.css';
import { useAuth0 } from "@auth0/auth0-react";


const TaskManager: React.FC = () => {
    
  const [input, setInput] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { getAccessTokenSilently } = useAuth0();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try{
        const response = await postUserInput(input, getAccessTokenSilently);
        const test = response;
        setSchedule(response);
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
        
        const response = await getUserInformation(getAccessTokenSilently);
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
        <h1>Schedule Planner</h1>
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

        {error && <div style={{ color: 'red' }}>{error}</div>}

      {schedule && (
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

      )}
      </div>
  )
};

export default TaskManager;

/*

      {result && tasks && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Task Plan</h2>
          {result.timeframe === "week" ? (
            <Calendar selectedDay={selectedDay} onSelect={setSelectedDay} />
          ) : (
            <TaskList tasks={result.tasks} />
          )}
          {selectedDay && tasks.days && (
            <TaskList tasks={tasks.days[selectedDay]?.tasks || []} />
          )}
        </div>
      )}
    </div>
  );
};

const TaskList = ({ tasks }) => (
  <Card className="mt-4 p-2">
    <CardContent>
      <ul>
        {tasks.map((task, index) => (
          <li key={index} className="border-b py-2">
            {task.name} - {task.time_in_hours} hrs
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
);



/*
const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<string>("initial");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const data = await getApiTest();
        setTasks(data);
      } catch (err) {
        setError('Failed to fetch posts');
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (

<p>{tasks}</p>
//<p>this is just test</p>

  );
};

export default TaskList;


const TaskList: React.FC = () => {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  const callOpenAI = async () => {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: input }],
        }),
      });

      const data = await res.json();
      setResponse(data.choices?.[0]?.message?.content || "No response received");
    } catch (error) {
      console.error("Error calling OpenAI:", error);
      setResponse("Failed to fetch response.");
    }

    setLoading(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">Task Manager</h2>
      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        placeholder="Enter your tasks here"
        className="border rounded p-2 w-full"
      />
      <button
        onClick={callOpenAI}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
        disabled={loading}
      >
        {loading ? "Processing..." : "Submit"}
      </button>
      {response && (
        <div className="mt-4 p-2 bg-gray-100 rounded">
          <strong>Response:</strong> {response}
        </div>
      )}
    </div>
  );
};

export default TaskList;
*/
