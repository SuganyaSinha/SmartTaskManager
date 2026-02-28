import api from "./api"
import { NewTask } from '../types/common';
import { createTask } from "./taskService";
import moment from "moment";

export const postUserInput = async (input: string) : Promise<NewTask[]>=> {
  try {

    // Get response from openai api
    const currentDate = moment().format('YYYY-MM-DDTHH:mm:ssZ');
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const response = await api.post('/api/openai/smart-schedule', {
        userInput: input,
        currentDate: currentDate,
        timeZone: timeZone
    }, {
        headers: { 'Content-Type': 'application/json' },
    });

    const openAiTasks:NewTask[] = JSON.parse(response.data.response);

      const results = await Promise.all(
        openAiTasks.map(task => createTask({
        ...task,
        timezone: timeZone
      }))
      );

      return results;

  } catch (error) {
      console.error("postUserInput API call failed:", error);
      throw error;
  }
};
