import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queueEntryApi } from "@/lib/api/queue-entries";

export const useActiveEntries = (queueId: string) => {
  return useQuery({
    queryKey: ["queue-entries", queueId],
    queryFn: async () => {
      const response = await queueEntryApi.getActiveEntries(queueId);
      return response.data;
    },
    enabled: !!queueId,
    refetchInterval: 5000, // Poll every 5 seconds for live updates
  });
};

export const useAllEntries = (queueId: string) => {
  return useQuery({
    queryKey: ["queue-entries-all", queueId],
    queryFn: async () => {
      const response = await queueEntryApi.getAllEntries(queueId);
      return response.data;
    },
    enabled: !!queueId,
    refetchInterval: 10000, // Poll every 10 seconds
  });
};

export const useCallNext = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (queueId: string) => {
      const response = await queueEntryApi.callNext(queueId);
      return response.data;
    },
    onSuccess: (_, queueId) => {
      queryClient.invalidateQueries({ queryKey: ["queue-entries", queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue-entries-all", queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue", queueId] });
    },
  });
};

export const useStartServing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, queueId }: { entryId: string; queueId: string }) => {
      const response = await queueEntryApi.startServing(entryId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["queue-entries", variables.queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue-entries-all", variables.queueId] });
    },
  });
};

export const useCompleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, queueId }: { entryId: string; queueId: string }) => {
      const response = await queueEntryApi.completeService(entryId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["queue-entries", variables.queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue-entries-all", variables.queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue", variables.queueId] });
    },
  });
};

export const useNoShow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entryId, queueId }: { entryId: string; queueId: string }) => {
      const response = await queueEntryApi.handleNoShow(entryId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["queue-entries", variables.queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue-entries-all", variables.queueId] });
    },
  });
};

export const useAddWalkIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ queueId, data }: { queueId: string; data: { customerName?: string; customerPhone?: string; priority?: string } }) => {
      const response = await queueEntryApi.addWalkIn(queueId, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["queue-entries", variables.queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue-entries-all", variables.queueId] });
      queryClient.invalidateQueries({ queryKey: ["queue", variables.queueId] });
    },
  });
};
