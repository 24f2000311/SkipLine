import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";

export const useLogin = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: any) => {
      const response = await authApi.login(credentials);
      return response.data;
    },
    onSuccess: (data) => {
      // data contains { user, tokens: { accessToken, refreshToken } } based on backend
      if (data.tokens?.accessToken && data.user) {
        // Ensure all stale queries are purged before establishing new session
        queryClient.clear();
        setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
        router.push("/organizer/dashboard");
      }
    },
  });
};
