import api from "./api";

//TBD - Remove this file

export const getUserInformation = async (): Promise<string> => {
  try {
    const response = await api.get('/api/userprofile', {
        headers: { 'Content-Type': 'application/json' },
    });
    console.log(response.data);
    return response.data.message;
  } catch (error) {
      console.error("API call failed:", error);
      throw error;
  }
};
