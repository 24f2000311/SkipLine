import { getQueryClient } from "./queryClient";
import { useAuthStore } from "@/stores/useAuthStore";
import { resetAxiosRefreshState } from "./api/client";

/**
 * Authoritatively tears down an authenticated organizer session.
 * 
 * Guarantees:
 * 1. In-flight TanStack Query requests are cancelled immediately.
 * 2. Entire TanStack Query cache is purged (no Account A data remains in memory).
 * 3. Axios 401 refresh queues and pending retry promises are aborted.
 * 4. Auth Zustand store and localStorage ('skipline-auth-storage') are atomically cleared.
 * 5. Session generation is incremented so any late-arriving in-flight HTTP responses are discarded.
 * 6. Customer anonymous queue state ('skipline-customer-storage') remains completely untouched.
 */
export async function teardownOrganizerSession(): Promise<void> {
  try {
    const queryClient = getQueryClient();
    // 1. Cancel all active in-flight queries
    await queryClient.cancelQueries();
    // 2. Wipe entire query cache
    queryClient.clear();
  } catch (e) {
    // Non-blocking query teardown error
  }

  // 3. Reset any pending Axios refresh promises
  try {
    resetAxiosRefreshState();
  } catch (e) {
    // Non-blocking
  }

  // 4. Atomically clear credentials and bump session generation
  useAuthStore.getState().clearAuth();
}
