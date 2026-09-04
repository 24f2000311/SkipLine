import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CustomerState {
  entries: Record<string, { entryId: string; token: string }>;
  saveEntry: (queueId: string, entryId: string, token: string) => void;
  clearEntry: (queueId: string) => void;
  getEntry: (queueId: string) => { entryId: string; token: string } | null;
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
    }),
    {
      name: "skipline-customer-storage",
    }
  )
);
