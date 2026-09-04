import { apiClient } from "./client";

export const customerApi = {
  joinQueue: async (queueId: string, data: { customerName: string; customerPhone: string }) => {
    // Generate a unique session ID if not exists
    let sessionId = localStorage.getItem("skipline_session_id");
    if (!sessionId) {
      sessionId = `sess_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem("skipline_session_id", sessionId);
    }
    
    return apiClient.post(`/queues/${queueId}/entries`, {
      ...data,
      sessionId,
      priority: "NORMAL", // default, organizers can manually upgrade
    });
  },

  getStatus: async (entryId: string, token: string) => {
    return apiClient.get(`/queue-entries/${entryId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  leaveQueue: async (entryId: string, token: string) => {
    return apiClient.post(`/queue-entries/${entryId}/leave`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },
};
