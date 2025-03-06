import axios from "axios";
import {Schedule } from '../types/common';
import { GetTokenSilentlyOptions } from "@auth0/auth0-react";
import { GetTokenSilentlyVerboseResponse } from "@auth0/auth0-spa-js";

const api_url = process.env.REACT_APP_STM_API_URL;

const api = axios.create({
    baseURL: api_url, // Your .NET Core API URL from launchSettings.json
    withCredentials: false,
});

export const getApiTest = async (): Promise<string> => {
    try {
        const response = await api.get('/api/test');
        return response.data.message; // Access the message property from your TestController response
    } catch (error) {
        console.error("API call failed:", error);
        throw error;
    }
};

export const getUserInformation = async (getAccessTokenSilently: { (options: GetTokenSilentlyOptions & { detailedResponse: true; }): Promise<GetTokenSilentlyVerboseResponse>; (options?: GetTokenSilentlyOptions): Promise<string>; (options: GetTokenSilentlyOptions): Promise<GetTokenSilentlyVerboseResponse | string>; (): any; }): Promise<string> => {
  try {
    
    const token = await getAccessTokenSilently();
    console.log(token);
    const response = await api.get(
      '/api/userprofile',
      {
          headers: {
              'Content-Type': 'application/json', // Set the Content-Type header
               Authorization: `Bearer ${token}`
          },
      }
      );
      var test = response.data;
      return response.data.message; // Access the message property from your TestController response
  } catch (error) {
      console.error("API call failed:", error);
      throw error;
  }
};

export const postUserInput = async (input) : Promise<Schedule>=> {
  try {
     
    //const { getAccessTokenSilently } = useAuth0();
    //const token = await getAccessTokenSilently();
      const response = await api.post(
        '/api/openai/ask',
        JSON.stringify(input),
        {
            headers: {
                'Content-Type': 'application/json', // Set the Content-Type header
                 //Authorization: `Bearer ${token}`
            },
        }
        );
        const test = JSON.parse(response.data.response);
      return JSON.parse(response.data.response); // Access the message property from your TestController response
  } catch (error) {
      console.error("API call failed:", error);
      throw error;
  }
};

// const api_url = process.env.STM_API_URL;
/*

import axios from "axios";
const api = axios.create({
    baseURL: "http://localhost:5098", // .NET Core API URL
    withCredentials: false, // Required if using authentication
  });
*/


export const get1ApiTest = () => {
    /*
    try {
      const response = await api.get(`/api/Test`);
      return response.data;
    } catch (error) {
      console.error("API call failed:", error);
      return null;
    }
      */
  };
  
