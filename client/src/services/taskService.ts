import api from "./api"
import { NewTask, TaskFilter } from '../types/common';

// Get all tasks for the user
export const getAllTasks = async () : Promise<NewTask[]>=> {
    try{
        const response = await api.get('api/tasks', {
            headers: { 'Content-Type': 'application/json' },
        });

        const test = response.data;
        return response.data;
    }
    catch(error)
    {
        // tbd log the error
        console.error("getAllTasks API call failed:", error);
        throw error;
    }
  };

export const getTasks = async (filter? : TaskFilter) : Promise<NewTask[]> => {
    try{
        const response = await api.get('/api/tasks', {
            headers: { 'Content-Type': 'application/json' },
            params: filter
        });

        const test = response.data;
        return response.data;
    }
    catch(error)
    {
        console.error("getTasks API call failed:", error);
        throw error;
    }
  };


// Create task for the user
export const createTask = async (task : NewTask) => {

    try{
        const response = await api.post('api/tasks', task, {
            headers: { 'Content-Type': 'application/json' },
        });

        const test = response.data;

        return response.data;
    }
    catch(error)
    {
        // tbd log the error
        console.error("createTask API call failed:", error);
        throw error;
    }
  };

/// Update task for the user
export const updateTask = async (taskId: string, updates: Partial<NewTask>) => {

    try{
        const response = await api.patch(`/api/tasks/${taskId}`, {
            id: updates.id,
            title: updates.title,
            start: updates.start,
            end: updates.end,
            priority: updates.priority,
            comments: updates.comments,
            status: updates.status
        }, {
            headers: { 'Content-Type': 'application/json' },
        });

        console.log("updateTask API response:", response);
        return response.data;
    }
    catch(error)
    {
        // tbd log the error
        console.error("updateTask API call failed:", error);
        throw error;
    }
  };

// Get a single task by ID
export const getTaskById = async (taskId: string): Promise<NewTask> => {
    try {
        const response = await api.get(`/api/tasks/${taskId}`, {
            headers: { 'Content-Type': 'application/json' },
        });
        return response.data;
    } catch (error) {
        console.error("getTaskById API call failed:", error);
        throw error;
    }
};

// Delete task for the user
// tbd not tested yet
export const deleteTask = async (taskId: string) => {

    try{
        const response = await api.delete(`/api/tasks/${taskId}`, {
            headers: { 'Content-Type': 'application/json' },
        });

        return response.data;
    }
    catch(error)
    {
        // tbd log the error
        console.error("deleteTask API call failed:", error);
        throw error;
    }
  };
