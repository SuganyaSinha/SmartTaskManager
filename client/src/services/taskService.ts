import api from "./api"
import { NewTask } from '../types/common';
import { GetTokenSilentlyOptions } from "@auth0/auth0-react";
import { GetTokenSilentlyVerboseResponse } from "@auth0/auth0-spa-js";

// Get all tasks for the user
// tbd not tested yet
export const getUserTasks = async (getAccessTokenSilently: any) : 
                                   Promise<NewTask[]>=> {

    try{
        const token = await getAccessTokenSilently();
        const response = await api.get(
            '/tasks',
            {
                headers: {
                    'Content-Type': 'application/json', 
                     Authorization: `Bearer ${token}`
                },
            }
            );
    
        const test = JSON.parse(response.data.response);
        return response.data;
    }
    catch(error)
    {
        // tbd log the error
        console.error("getUserTasks API call failed:", error);
        throw error;
    }
  };

// Get tasks for the user by month
// tbd not tested yet
export const getTasksForTheMonth = async (year : number,
                                          month : number, 
                                          getAccessTokenSilently : any) : 
                                          Promise<NewTask[]> => {
    try{
        const token = await getAccessTokenSilently();
        const response = await api.get(
            '/tasks/monthly',
            {
                params : { year , month },
                headers: {
                    'Content-Type': 'application/json', 
                     Authorization: `Bearer ${token}`
                },
            }
            );
    
        const test = JSON.parse(response.data.response);
        return response.data;
    }
    catch(error)
    {
        // tbd log the error
        console.error("getTasksForTheMonth API call failed:", error);
        throw error;
    }
  };

// Create task for the user
// tbd not tested yet
  export const createTask = async (task : NewTask, getAccessTokenSilently : any) => {

    try{
        const token = await getAccessTokenSilently();
        const response = await api.post(
            '/tasks',
            task,
            {
                headers: {
                    'Content-Type': 'application/json', 
                     Authorization: `Bearer ${token}`
                },
            }
            );
    
        const test = JSON.parse(response.data.response);
        return response.data;
    }
    catch(error)
    {
        // tbd log the error
        console.error("createTask API call failed:", error);
        throw error;
    }
  };

// Update task for the user
// tbd not tested yet
export const updateTask = async (taskId: string, updates: Partial<NewTask>, getAccessTokenSilently : any) => {

    try{
        const token = await getAccessTokenSilently();
        const response = await api.patch(
            '/tasks',
            updates,
            {
                headers: {
                    'Content-Type': 'application/json', 
                     Authorization: `Bearer ${token}`
                },
            }
            );
    
        const test = JSON.parse(response.data.response);
        return response.data;
    }
    catch(error)
    {
        // tbd log the error
        console.error("updateTask API call failed:", error);
        throw error;
    }
  };

// Delete task for the user
// tbd not tested yet
export const deleteTask = async (taskId: string, getAccessTokenSilently : any) => {

    try{
        const token = await getAccessTokenSilently();
        const response = await api.delete(
            '`/tasks/${taskId}`',
            {
                headers: {
                    'Content-Type': 'application/json', 
                     Authorization: `Bearer ${token}`
                },
            }
            );
    
        const test = JSON.parse(response.data.response);
        return response.data;
    }
    catch(error)
    {
        // tbd log the error
        console.error("deleteTask API call failed:", error);
        throw error;
    }
  };