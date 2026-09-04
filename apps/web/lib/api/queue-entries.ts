import { apiClient } from "./client";

export const queueEntryApi = {
  getActiveEntries: async (queueId: string) => {
    return apiClient.get(`/queues/${queueId}/entries`);
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
};
