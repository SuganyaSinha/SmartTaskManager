import api from "./api"

export const getApiTest = async (): Promise<string> => {
    try {
        const response = await api.get('/api/test');
        return response.data.message; // Access the message property from your TestController response
    } catch (error) {
        console.error("API call failed:", error);
        throw error;
    }
};

