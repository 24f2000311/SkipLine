import { apiClient } from "./client";

export const queueEntryApi = {
  getActiveEntries: async (queueId: string) => {
    return apiClient.get(`/queues/${queueId}/entries`);
  },
  getAllEntries: async (queueId: string) => {
    return apiClient.get(`/queues/${queueId}/entries/all`);
  },
  callNext: async (queueId: string) => {
    return apiClient.post(`/queues/${queueId}/call-next`);
  },
  startServing: async (entryId: string) => {
    return apiClient.post(`/queue-entries/${entryId}/start`);
  },
  completeService: async (entryId: string) => {
    return apiClient.post(`/queue-entries/${entryId}/complete`);
  },
  handleNoShow: async (entryId: string) => {
    return apiClient.post(`/queue-entries/${entryId}/no-show`);
  },
  addWalkIn: async (queueId: string, data: { customerName?: string; customerPhone?: string; priority?: string }) => {
    return apiClient.post(`/queues/${queueId}/walk-ins`, data);
  },
};
