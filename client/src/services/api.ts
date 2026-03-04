import axios from "axios";

let _getToken: (() => Promise<string>) | null = null;

// Called once from App.tsx to wire in the useApiToken hook
export const setAuthTokenGetter = (fn: () => Promise<string>) => {
  _getToken = fn;
};

const api = axios.create({
    baseURL: import.meta.env.VITE_STM_API_URL,
    withCredentials: false,
});

// Intercepts every request and attaches the Bearer token.
// If the token fetch fails (e.g. missing refresh token), useApiToken
// handles the redirect to login before the error propagates.
api.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
