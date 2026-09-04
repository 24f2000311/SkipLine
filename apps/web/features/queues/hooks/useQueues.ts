import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queueApi } from "@/lib/api/queues";

export const useQueues = (eventId: string) => {
  return useQuery({
    queryKey: ["queues", eventId],
    queryFn: async () => {
      const response = await queueApi.getByEvent(eventId);
      return response.data;
    },
    enabled: !!eventId,
  });
};

export const useQueue = (queueId: string) => {
  return useQuery({
    queryKey: ["queue", queueId],
    queryFn: async () => {
      const response = await queueApi.getOne(queueId);
      return response.data;
    },
    enabled: !!queueId,
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
    refetchInterval: 10000, // Poll every 10s to keep capacity/status fresh
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
