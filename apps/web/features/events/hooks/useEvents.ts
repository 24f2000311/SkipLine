import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventApi } from "@/lib/api/events";
import { useAuthStore } from "@/stores/useAuthStore";

export const useEvents = () => {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["organizer-events", user?.id],
    queryFn: async () => {
      const response = await eventApi.getAll();
      return response.data;
    },
    enabled: hasHydrated && !!accessToken && !!user?.id,
  });
};

export const useEvent = (id: string) => {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["organizer-events", user?.id, id],
    queryFn: async () => {
      const response = await eventApi.getOne(id);
      return response.data;
    },
    enabled: !!id && hasHydrated && !!accessToken && !!user?.id,
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await eventApi.create(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-events", user?.id] });
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async (id: string) => {
      return await eventApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-events", user?.id] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await eventApi.update(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizer-events", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["organizer-events", user?.id, variables.id] });
    },
  });
};
