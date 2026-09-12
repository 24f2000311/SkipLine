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
  verifyEmail: async (token: string) => {
    return apiClient.post("/auth/verify-email", { token });
  },
  resendVerification: async (email: string) => {
    return apiClient.post("/auth/resend-verification", { email });
  },
  forgotPassword: async (email: string) => {
    return apiClient.post("/auth/forgot-password", { email });
  },
  resetPassword: async (data: { token: string; password: string }) => {
    return apiClient.post("/auth/reset-password", data);
  },
  deleteAccount: async (password: string) => {
    return apiClient.delete("/auth/account", { data: { password } });
  },
};

