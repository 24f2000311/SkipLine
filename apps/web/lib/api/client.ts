import axios from "axios";
import { useAuthStore } from "@/stores/useAuthStore";
import { getApiUrl } from "../url";

const API_BASE_URL = getApiUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const getAuthHeader = (headers: any) => {
  if (!headers) return undefined;
  if (typeof headers.get === "function") {
    return headers.get("Authorization") || headers.get("authorization");
  }
  return headers.Authorization || headers.authorization || headers["Authorization"] || headers["authorization"];
};

// Add a request interceptor to inject the token
apiClient.interceptors.request.use(
  async (config) => {
    // If in browser and auth store hasn't hydrated yet, wait briefly for hydration (up to 150ms)
    if (typeof window !== "undefined" && !useAuthStore.getState()._hasHydrated) {
      await new Promise<void>((resolve) => {
        const unsub = useAuthStore.subscribe((state) => {
          if (state._hasHydrated) {
            unsub();
            resolve();
          }
        });
        setTimeout(() => {
          unsub();
          resolve();
        }, 150);
      });
    }

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
      const authHeader = getAuthHeader(originalRequest.headers);
      const storeState = useAuthStore.getState();
      
      // Only clear/refresh if the request was authenticated or we have a refresh token
      if (storeState.refreshToken && (authHeader || storeState.accessToken)) {
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
          // Robust refresh endpoint URL
          const refreshUrl = `${API_BASE_URL.replace(/\/+$/, "")}/auth/refresh`;
          const refreshRes = await axios.post(refreshUrl, {
            refreshToken: storeState.refreshToken
          });
          
          const newTokens = refreshRes.data?.data || refreshRes.data;
          
          // Update store
          if (storeState.user && newTokens?.accessToken) {
            storeState.setAuth(storeState.user, newTokens.accessToken, newTokens.refreshToken);
          }
          
          processQueue(null, newTokens?.accessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newTokens?.accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          storeState.clearAuth();
        } finally {
          isRefreshing = false;
        }
      }
    }
    const apiError = error.response?.data?.error;
    const message = apiError?.message || error.message || "An unexpected error occurred";
    const customError = new Error(message);
    (customError as any).code = apiError?.code;
    (customError as any).status = error.response?.status;
    (customError as any).response = error.response;
    return Promise.reject(customError);
  }
);
