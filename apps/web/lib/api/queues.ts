import { apiClient } from "./client";

export const queueApi = {
  getByEvent: async (eventId: string) => {
    return apiClient.get(`/events/${eventId}/queues`);
  },
  getOne: async (id: string) => {
    return apiClient.get(`/queues/${id}`);
  },
  getPublic: async (id: string) => {
    return apiClient.get(`/queues/${id}/public`);
  },
  create: async (data: any) => {
    return apiClient.post("/queues", data);
  },
  update: async (id: string, data: any) => {
    return apiClient.put(`/queues/${id}`, data);
  },
  delete: async (id: string) => {
    return apiClient.delete(`/queues/${id}`);
  },
};
