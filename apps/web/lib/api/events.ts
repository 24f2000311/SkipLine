import { apiClient } from "./client";

export const eventApi = {
  getAll: async () => {
    return apiClient.get("/events");
  },
  getOne: async (id: string) => {
    return apiClient.get(`/events/${id}`);
  },
  create: async (data: any) => {
    return apiClient.post("/events", data);
  },
  update: async (id: string, data: any) => {
    return apiClient.put(`/events/${id}`, data);
  },
  delete: async (id: string) => {
    return apiClient.delete(`/events/${id}`);
  },
};
