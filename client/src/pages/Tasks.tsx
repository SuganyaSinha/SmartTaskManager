import React, { useEffect, useState } from 'react';
import { getApiTest } from '../services/StpService';

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
*/

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
    <div>This is test</div>
    /*
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
    */
  );
};

export default TaskList;
