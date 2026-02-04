import api from "./api"
import { NewTask } from '../types/common';
import { GetTokenSilentlyOptions } from "@auth0/auth0-react";
import { GetTokenSilentlyVerboseResponse } from "@auth0/auth0-spa-js";
import { createTask } from "./taskService";
import moment from "moment";

export const postUserInput = async (input: string, getAccessTokenSilently: { (options: GetTokenSilentlyOptions & { detailedResponse: true; }): Promise<GetTokenSilentlyVerboseResponse>; (options?: GetTokenSilentlyOptions): Promise<string>; (options: GetTokenSilentlyOptions): Promise<GetTokenSilentlyVerboseResponse | string>; }) : Promise<NewTask[]>=> {
  try {
    
    // Get response from openai api
    const currentDate = moment().format('YYYY-MM-DDTHH:mm:ssZ'); 
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const token = await getAccessTokenSilently();
    const response = await api.post(
        '/api/openai/ask',
        {
          userInput: input,
          currentDate: currentDate, 
          timeZone: timeZone // Pass user's local time
        },
        {
            headers: {
                'Content-Type': 'application/json', 
                 Authorization: `Bearer ${token}`
            },
        }
    );
   const openAiTasks:NewTask[] = JSON.parse(response.data.response);

      /*Transform OpenAI tasks into TaskItem format and create them
      const taskItems = openAiTasks.map(task=> ({
        id: "", // Leave empty; MongoDB will generate it
        title: task.title,
        start: new Date(task.start), // Convert to Date object
        end: new Date(task.end),     // Convert to Date object
        priority: task.priority,
        comments: task.comments,
        userId: userId,              // Add userId from Auth0
      }));
      */

      const results = await Promise.all(
        openAiTasks.map(task => createTask({
        ...task,
        timezone: timeZone
      }, getAccessTokenSilently))
      );
  /*
      const createdTasks: NewTask[] = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);
      const errors = results
        .filter(r => r.status === 'rejected')
        .map((r, i) => ({
          task: taskItems[i],
          error: r.reason.response?.data || r.reason.message,
        }));

        if (errors.length > 0) {
          const errorMsg = errors.map(e => `${e.task.title}: ${e.error}`).join(", ");
          console.log(errorMsg);
          setError(`Failed to create some tasks: ${errorMsg}`);
          if (createdTasks.length > 0) {
            addTasksFromApi(createdTasks); // Optional: Show partial success
          }else {
            addTasksFromApi(createdTasks);
          }*/
            return results;
        

       

      //return JSON.parse(response.data.response); 
  } catch (error) {
      console.error("postUserInput API call failed:", error);
      throw error;
  }
};