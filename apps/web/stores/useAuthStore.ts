import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  name: string;
  email: string;
  status: string;
  emailVerifiedAt?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  sessionGeneration: number;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  setAuth: (user: User, accessToken: string, refreshToken?: string) => void;
  updateUser: (updates: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      sessionGeneration: 0,
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),
      setAuth: (user, accessToken, refreshToken) => 
        set((state) => ({ 
          user, 
          accessToken, 
          refreshToken: refreshToken ?? state.refreshToken,
          sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          sessionGeneration: (state.sessionGeneration || 0) + 1,
        })),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
      clearAuth: () => 
        set((state) => ({ 
          user: null, 
          accessToken: null, 
          refreshToken: null,
          sessionId: null,
          sessionGeneration: (state.sessionGeneration || 0) + 1,
        })),
    }),
    {
      name: "skipline-auth-storage", // name of the item in the storage (must be unique)
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Cross-tab synchronization for auth state (e.g. email verification in another tab)
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === "skipline-auth-storage" && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        const incomingUser = parsed?.state?.user;
        const currentStore = useAuthStore.getState();
        if (incomingUser && currentStore.user && currentStore.user.id === incomingUser.id) {
          if (currentStore.user.emailVerifiedAt !== incomingUser.emailVerifiedAt) {
            currentStore.updateUser({
              emailVerifiedAt: incomingUser.emailVerifiedAt,
            });
          }
        }
      } catch {
        // Safe ignore
      }
    }
  });
}
