import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "../lib/queryClient";
import { useAuthStore } from "../stores/useAuthStore";
import { authApi } from "../lib/api/auth";
import { eventApi } from "../lib/api/events";
import DashboardPage from "../app/organizer/dashboard/page";
import VerifyEmailPage from "../app/(auth)/verify-email/page";
import { VerificationRequiredDialog } from "../features/auth/components/VerificationRequiredDialog";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/organizer/dashboard",
  useSearchParams: vi.fn(() => ({
    get: (key: string) => (key === "token" ? "valid-verify-token-xyz" : null),
  })),
}));

describe("Email Verification State Synchronization Unit Tests", () => {
  let queryClient: any;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient = getQueryClient();
    queryClient.clear();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it("1. useAuthStore.updateUser updates emailVerifiedAt immediately without losing session tokens", () => {
    const initialUser = {
      id: "org-1",
      name: "Organizer One",
      email: "org1@example.com",
      status: "ACTIVE",
      emailVerifiedAt: null,
      createdAt: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth(initialUser, "access-token-123", "refresh-token-456");

    expect(useAuthStore.getState().user?.emailVerifiedAt).toBeNull();
    expect(useAuthStore.getState().accessToken).toBe("access-token-123");

    // Perform partial update
    const verifiedTimestamp = new Date().toISOString();
    act(() => {
      useAuthStore.getState().updateUser({ emailVerifiedAt: verifiedTimestamp });
    });

    const updatedState = useAuthStore.getState();
    expect(updatedState.user?.emailVerifiedAt).toBe(verifiedTimestamp);
    expect(updatedState.user?.name).toBe("Organizer One");
    expect(updatedState.accessToken).toBe("access-token-123");
    expect(updatedState.refreshToken).toBe("refresh-token-456");
  });

  it("2. Cross-tab storage event updates emailVerifiedAt without requiring a page reload", () => {
    const initialUser = {
      id: "org-2",
      name: "Organizer Two",
      email: "org2@example.com",
      status: "ACTIVE",
      emailVerifiedAt: null,
      createdAt: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth(initialUser, "access-token-222");
    expect(useAuthStore.getState().user?.emailVerifiedAt).toBeNull();

    // Simulate Tab B updating localStorage
    const verifiedTimestamp = new Date().toISOString();
    const updatedStoragePayload = JSON.stringify({
      state: {
        user: { ...initialUser, emailVerifiedAt: verifiedTimestamp },
        accessToken: "access-token-222",
        refreshToken: null,
      },
      version: 0,
    });

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "skipline-auth-storage",
          newValue: updatedStoragePayload,
        })
      );
    });

    // Tab A's store immediately reflects verified state without reload!
    expect(useAuthStore.getState().user?.emailVerifiedAt).toBe(verifiedTimestamp);
  });

  it("3. VerifyEmailPage updates store immediately upon successful verification", async () => {
    const unverifiedUser = {
      id: "org-3",
      name: "Organizer Three",
      email: "org3@example.com",
      status: "ACTIVE",
      emailVerifiedAt: null,
      createdAt: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth(unverifiedUser, "access-token-333");

    const verifiedDate = new Date().toISOString();
    vi.spyOn(authApi, "verifyEmail").mockResolvedValueOnce({
      data: {
        success: true,
        message: "Email verified successfully",
        data: {
          user: {
            ...unverifiedUser,
            emailVerifiedAt: verifiedDate,
          },
        },
      },
    } as any);

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(screen.getByText(/your email is verified\./i)).toBeTruthy();
      expect(useAuthStore.getState().user?.emailVerifiedAt).toBe(verifiedDate);
    });
  });

  it("4. Dashboard Create Event dynamically unlocks without reload when verified in background", async () => {
    const unverifiedUser = {
      id: "org-4",
      name: "Organizer Four",
      email: "org4@example.com",
      status: "ACTIVE",
      emailVerifiedAt: null,
      createdAt: new Date().toISOString(),
    };

    useAuthStore.getState().setAuth(unverifiedUser, "access-token-444");
    vi.spyOn(eventApi, "getAll").mockResolvedValue({ data: [] } as any);

    // Mock getMe returning verified status
    const verifiedDate = new Date().toISOString();
    vi.spyOn(authApi, "getMe").mockResolvedValue({
      data: {
        data: {
          ...unverifiedUser,
          emailVerifiedAt: verifiedDate,
        },
      },
    } as any);

    render(<DashboardPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Your first event starts here/i)).toBeTruthy();
    });

    // Click "Create Event"
    const createBtn = screen.getByRole("button", { name: /create event/i });
    fireEvent.click(createBtn);

    // Dynamic pre-flight check validates against backend, updates store, and navigates directly
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/organizer/events/new");
      expect(useAuthStore.getState().user?.emailVerifiedAt).toBe(verifiedDate);
    });
  });

  it("5. VerificationRequiredDialog auto-dismisses when user becomes verified", async () => {
    const onOpenChange = vi.fn();

    const { rerender } = render(
      <VerificationRequiredDialog
        open={true}
        onOpenChange={onOpenChange}
        actionContext="event"
      />
    );

    expect(screen.getByRole("heading", { name: /verify your email/i })).toBeTruthy();

    // User is now verified in store
    act(() => {
      useAuthStore.setState({
        user: {
          id: "org-5",
          name: "Organizer Five",
          email: "org5@test.com",
          status: "ACTIVE",
          emailVerifiedAt: new Date().toISOString(),
        },
      });
    });

    rerender(
      <VerificationRequiredDialog
        open={true}
        onOpenChange={onOpenChange}
        actionContext="event"
      />
    );

    // Auto-dismisses dialog
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
