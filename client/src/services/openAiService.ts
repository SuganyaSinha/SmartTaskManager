import api from "./api"
import { NewTask, ScheduledTaskWithNotes } from '../types/common';
import { createTask } from "./taskService";
import moment from "moment";

// Matches the server's ScheduledTaskResult shape (System.Text.Json PascalCase)
interface ServerScheduledTask {
  Title: string;
  Start: string;
  End: string;
  Priority: string;
  Comments: string;
  TaskCategory?: string;
  IsAllocatedOutsideRequestedTime: boolean;
  AllocationNote: string;
}

export const postUserInput = async (input: string): Promise<ScheduledTaskWithNotes[]> => {
  try {
    const currentDate = moment().format('YYYY-MM-DDTHH:mm:ssZ');
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const response = await api.post('/api/openai/smart-schedule', {
        userInput: input,
        currentDate: currentDate,
        timeZone: timeZone
    }, {
        headers: { 'Content-Type': 'application/json' },
    });


    const serverTasks: ServerScheduledTask[] = JSON.parse(response.data.response);

    const results = await Promise.all(
      serverTasks.map(async (serverTask) => {
        const created = await createTask({
          ...(serverTask as unknown as NewTask),
          timezone: timeZone,
          category: serverTask.TaskCategory?.toLowerCase()
        });

        return {
          ...created,
          isAllocatedOutsideRequestedTime: serverTask.IsAllocatedOutsideRequestedTime,
          allocationNote: serverTask.AllocationNote,
        } as ScheduledTaskWithNotes;
      })
    );

    return results;

  } catch (error) {
      console.error("postUserInput API call failed:", error);
      throw error;
  }
};
