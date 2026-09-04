import { apiClient } from "./client";

export const authApi = {
  login: async (data: any) => {
    return apiClient.post("/auth/login", data);
  },
  register: async (data: any) => {
    return apiClient.post("/auth/register", data);
  },
  logout: async (refreshToken: string) => {
    return apiClient.post("/auth/logout", { refreshToken });
  },
  getMe: async () => {
    return apiClient.get("/auth/me");
  },
};
