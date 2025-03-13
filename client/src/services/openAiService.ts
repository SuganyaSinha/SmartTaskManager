import api from "./api"
import { NewTask } from '../types/common';
import { GetTokenSilentlyOptions } from "@auth0/auth0-react";
import { GetTokenSilentlyVerboseResponse } from "@auth0/auth0-spa-js";

export const postUserInput = async (input: string, getAccessTokenSilently: { (options: GetTokenSilentlyOptions & { detailedResponse: true; }): Promise<GetTokenSilentlyVerboseResponse>; (options?: GetTokenSilentlyOptions): Promise<string>; (options: GetTokenSilentlyOptions): Promise<GetTokenSilentlyVerboseResponse | string>; }) : Promise<NewTask[]>=> {
  try {
     
    const token = await getAccessTokenSilently();
    console.log(token);
      const response = await api.post(
        '/api/openai/ask',
        JSON.stringify(input),
        {
            headers: {
                'Content-Type': 'application/json', 
                 Authorization: `Bearer ${token}`
            },
        }
        );
        const test = JSON.parse(response.data.response);
      return JSON.parse(response.data.response); 
  } catch (error) {
      console.error("API call failed:", error);
      throw error;
  }
};