import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";

export const useLogin = () => {
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
        setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
        router.push("/organizer/dashboard");
      }
    },
  });
};
