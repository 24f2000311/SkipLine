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

// Add a request interceptor to inject the token and attach session generation
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

    const storeState = useAuthStore.getState();
    const token = storeState.accessToken;
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Attach active session generation to prevent stale in-flight responses
    (config as any)._sessionGeneration = storeState.sessionGeneration;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global refresh state
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: any) => void;
  sessionGen: number;
}> = [];

export const resetAxiosRefreshState = () => {
  isRefreshing = false;
  failedQueue.forEach((prom) => {
    prom.reject(new Error("Session terminated"));
  });
  failedQueue = [];
};

const processQueue = (error: any, token: string | null = null, currentGen: number) => {
  failedQueue.forEach((prom) => {
    if (prom.sessionGen !== currentGen) {
      prom.reject(new Error("Session terminated"));
    } else if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => {
    // Drop response if session changed while request was in flight
    const reqGen = (response.config as any)?._sessionGeneration;
    const currentGen = useAuthStore.getState().sessionGeneration;
    if (reqGen !== undefined && reqGen !== currentGen) {
      const staleError = new Error("Stale response: session terminated");
      (staleError as any).code = "SESSION_TERMINATED";
      (staleError as any).isStaleSession = true;
      return Promise.reject(staleError);
    }

    return response.data; // Standardize response parsing to just return the data payload
  },
  async (error) => {
    const originalRequest = error.config;

    // Drop response if session changed while request was in flight
    const reqGen = (originalRequest as any)?._sessionGeneration;
    const currentGen = useAuthStore.getState().sessionGeneration;
    if (reqGen !== undefined && reqGen !== currentGen) {
      const staleError = new Error("Stale response: session terminated");
      (staleError as any).code = "SESSION_TERMINATED";
      (staleError as any).isStaleSession = true;
      return Promise.reject(staleError);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const authHeader = getAuthHeader(originalRequest.headers);
      const storeState = useAuthStore.getState();
      const refreshStartGen = storeState.sessionGeneration;
      
      // Only clear/refresh if the request was authenticated or we have a refresh token
      if (storeState.refreshToken && (authHeader || storeState.accessToken)) {
        if (isRefreshing) {
          try {
            const token = await new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject, sessionGen: refreshStartGen });
            });
            // Verify session didn't change while waiting in queue
            if (useAuthStore.getState().sessionGeneration !== refreshStartGen) {
              return Promise.reject(new Error("Session terminated while waiting for refresh"));
            }
            originalRequest.headers.Authorization = `Bearer ${token}`;
            (originalRequest as any)._sessionGeneration = useAuthStore.getState().sessionGeneration;
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
          const currentStore = useAuthStore.getState();

          // If session was cleared/changed while refresh request was in flight, discard!
          if (currentStore.sessionGeneration !== refreshStartGen || !isRefreshing) {
            processQueue(new Error("Session terminated during refresh"), null, currentStore.sessionGeneration);
            return Promise.reject(new Error("Session terminated during refresh"));
          }
          
          // Update store only if session generation strictly matches
          if (currentStore.user && newTokens?.accessToken) {
            currentStore.setAuth(currentStore.user, newTokens.accessToken, newTokens.refreshToken);
          }
          
          processQueue(null, newTokens?.accessToken, currentStore.sessionGeneration);

          
          originalRequest.headers.Authorization = `Bearer ${newTokens?.accessToken}`;
          (originalRequest as any)._sessionGeneration = useAuthStore.getState().sessionGeneration;
          return apiClient(originalRequest);
        } catch (refreshError) {
          const postRefreshGen = useAuthStore.getState().sessionGeneration;
          processQueue(refreshError, null, postRefreshGen);
          if (postRefreshGen === refreshStartGen) {
            storeState.clearAuth();
          }
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
