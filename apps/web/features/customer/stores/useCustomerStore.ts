import { create } from "zustand";
import { persist } from "zustand/middleware";

interface QueueEntryState {
  entryId: string;
  token: string;
  notified3Ahead?: boolean;
  notified1Ahead?: boolean;
  notifiedCalled?: boolean;
  acknowledgedCalled?: boolean;
}

interface CustomerState {
  entries: Record<string, QueueEntryState>;
  saveEntry: (queueId: string, entryId: string, token: string) => void;
  clearEntry: (queueId: string) => void;
  getEntry: (queueId: string) => QueueEntryState | null;
  updateNotificationState: (queueId: string, updates: Partial<QueueEntryState>) => void;
}

export const useCustomerStore = create<CustomerState>()(
  persist(
    (set, get) => ({
      entries: {},
      saveEntry: (queueId, entryId, token) =>
        set((state) => ({
          entries: {
            ...state.entries,
            [queueId]: { entryId, token },
          },
        })),
      clearEntry: (queueId) =>
        set((state) => {
          const newEntries = { ...state.entries };
          delete newEntries[queueId];
          return { entries: newEntries };
        }),
      getEntry: (queueId) => {
        return get().entries[queueId] || null;
      },
      updateNotificationState: (queueId, updates) =>
        set((state) => {
          const current = state.entries[queueId];
          if (!current) return state;
          return {
            entries: {
              ...state.entries,
              [queueId]: { ...current, ...updates },
            },
          };
        }),
    }),
    {
      name: "skipline-customer-storage",
    }
  )
);
