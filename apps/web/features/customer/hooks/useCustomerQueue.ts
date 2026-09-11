import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "@/lib/api/customer";
import { useCustomerStore } from "../stores/useCustomerStore";

export const useJoinQueue = () => {
  const queryClient = useQueryClient();
  const saveEntry = useCustomerStore((state) => state.saveEntry);

  return useMutation({
    mutationFn: async ({ queueId, data }: { queueId: string; data: { customerName: string; customerPhone: string } }) => {
      const response = await customerApi.joinQueue(queueId, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      saveEntry(variables.queueId, data.entry.id, data.accessToken);
      queryClient.invalidateQueries({ queryKey: ["customer-status", data.entry.id] });
    },
  });
};

export const useCustomerStatus = (queueId: string, isEventEnded?: boolean) => {
  const entryData = useCustomerStore((state) => state.entries[queueId]);

  return useQuery({
    queryKey: ["customer-status", entryData?.entryId],
    queryFn: async () => {
      if (!entryData) return null;
      const response = await customerApi.getStatus(entryData.entryId, entryData.token);
      return response.data;
    },
    enabled: !!entryData?.entryId,
    refetchInterval: (query) => {
      if (isEventEnded) return false;
      const data = query.state.data as any;
      if (data?.entry?.status === "COMPLETED" || data?.entry?.status === "CANCELLED" || data?.entry?.status === "SKIPPED") {
        return false;
      }
      return 5000;
    }, // Poll every 5s for live updates
  });
};

export const useLeaveQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ queueId, entryId, token }: { queueId: string; entryId: string; token: string }) => {
      const response = await customerApi.leaveQueue(entryId, token);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customer-status", variables.entryId] });
    },
  });
};
