import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";

export const useRegister = () => {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: any) => {
      // 1. Register the user
      await authApi.register(credentials);
      
      // 2. Automatically log them in since registration was successful
      const loginResponse = await authApi.login({
        email: credentials.email,
        password: credentials.password,
      });
      
      return loginResponse.data;
    },
    onSuccess: (data) => {
      // Set the auth store with the newly logged in user
      if (data.tokens?.accessToken && data.user) {
        queryClient.clear();
        setAuth(data.user, data.tokens.accessToken, data.tokens.refreshToken);
        router.push("/organizer/dashboard");
      }
    },
  });
};
