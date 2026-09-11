import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queueApi } from "@/lib/api/queues";
import { useAuthStore } from "@/stores/useAuthStore";

export const useQueues = (eventId: string) => {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["queues", eventId],
    queryFn: async () => {
      const response = await queueApi.getByEvent(eventId);
      return response.data;
    },
    enabled: !!eventId && hasHydrated && !!accessToken,
  });
};

export const useQueue = (queueId: string) => {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ["queue", queueId],
    queryFn: async () => {
      const response = await queueApi.getOne(queueId);
      return response.data;
    },
    enabled: !!queueId && hasHydrated && !!accessToken,
  });
};

export const usePublicQueue = (queueId: string) => {
  return useQuery({
    queryKey: ["public-queue", queueId],
    queryFn: async () => {
      const response = await queueApi.getPublic(queueId);
      return response.data;
    },
    enabled: !!queueId,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      if (!data) return 10000;
      
      const isEventEnded = new Date(data.event.endAt) <= new Date() || data.event.status === 'COMPLETED';
      const isEventCancelled = data.event.status === 'CANCELLED';
      if (isEventEnded || isEventCancelled || data.status === 'CLOSED') {
        return false;
      }
      return 10000;
    }, // Poll every 10s to keep capacity/status fresh
  });
};

export const useCreateQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await queueApi.create(data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["queues", variables.eventId] });
    },
  });
};

export const useUpdateQueue = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await queueApi.update(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["queue", variables.id] });
      // We might also want to invalidate the queues list, but we need the eventId.
      // Easiest is to invalidate all queues or pass eventId in variables.
      queryClient.invalidateQueries({ queryKey: ["queues"] }); 
    },
  });
};
