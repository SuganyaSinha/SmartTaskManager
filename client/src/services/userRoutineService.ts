import api from "./api"
import { RoutineProfile } from "../types/common";

export async function createUserRoutine(data: RoutineProfile) : Promise<RoutineProfile> {
    try{
        const response = await api.post('api/userroutine', data, {
            headers: { 'Content-Type': 'application/json' },
        });

        return response.data;
    }
    catch(error)
    {
        console.error("saveUserRoutine API call failed:", error);
        throw error;
    }
}

export async function getUserRoutine() : Promise<RoutineProfile> {
    try{
        const response = await api.get('api/userroutine', {
            headers: { 'Content-Type': 'application/json' },
        });

        return response.data;
    }
    catch(error)
    {
        console.error("getUserRoutine API call failed:", error);
        throw error;
    }
}

export async function updateUserRoutine(data: RoutineProfile) : Promise<RoutineProfile> {
    try{
        const response = await api.put('api/userroutine', data, {
            headers: { 'Content-Type': 'application/json' },
        });

        return response.data;
    }
    catch(error)
    {
        console.error("updateUserRoutine API call failed:", error);
        throw error;
    }
}
