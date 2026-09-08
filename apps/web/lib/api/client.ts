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
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    return response.data; // Standardize response parsing to just return the data payload
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const authHeader = originalRequest.headers?.Authorization;
      const storeState = useAuthStore.getState();
      
      // Only clear/refresh if the request was using the organizer's token
      if (storeState.accessToken && authHeader === `Bearer ${storeState.accessToken}`) {
        if (storeState.refreshToken) {
          if (isRefreshing) {
            try {
              const token = await new Promise((resolve, reject) => {
                failedQueue.push({ resolve, reject });
              });
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return apiClient(originalRequest);
            } catch (err) {
              return Promise.reject(err);
            }
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            // Manually do a POST request to avoid recursive interceptors
            const refreshRes = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken: storeState.refreshToken
            });
            
            const newTokens = refreshRes.data.data;
            
            // Update store
            if (storeState.user) {
              storeState.setAuth(storeState.user, newTokens.accessToken, newTokens.refreshToken);
            }
            
            processQueue(null, newTokens.accessToken);
            
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return apiClient(originalRequest);
          } catch (refreshError) {
            processQueue(refreshError, null);
            storeState.clearAuth();
          } finally {
            isRefreshing = false;
          }
        } else {
          // No refresh token available, just clear auth
          storeState.clearAuth();
        }
      }
    }
    return Promise.reject(error.response?.data || error);
  }
);
