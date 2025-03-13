import axios from "axios";

const api_url = process.env.REACT_APP_STM_API_URL;

const api = axios.create({
    baseURL: api_url,
    withCredentials: false,
});

export default api;
