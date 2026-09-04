import axios from "axios";
import { useAuthStore } from "@/stores/useAuthStore";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8123/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to inject the token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors globally (e.g., 401s)
apiClient.interceptors.response.use(
  (response) => {
    return response.data; // Standardize response parsing to just return the data payload
  },
  (error) => {
    if (error.response?.status === 401) {
      const authHeader = error.config?.headers?.Authorization;
      const storeToken = useAuthStore.getState().accessToken;
      
      // Only clear organizer auth if the request was using the organizer's token
      if (storeToken && authHeader === `Bearer ${storeToken}`) {
        useAuthStore.getState().clearAuth();
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);
