import axios from "axios";
import {NewTask, Schedule } from '../types/common';
import { GetTokenSilentlyOptions } from "@auth0/auth0-react";
import { GetTokenSilentlyVerboseResponse } from "@auth0/auth0-spa-js";

const api_url = process.env.REACT_APP_STM_API_URL;

const api = axios.create({
    baseURL: api_url, // Your .NET Core API URL from launchSettings.json
    withCredentials: false,
});

//TBD - Remove this file

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

  
