import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "../lib/queryClient";
import { useAuthStore } from "../stores/useAuthStore";
import { teardownOrganizerSession } from "../lib/auth-session";
import { authApi } from "../lib/api/auth";
import { eventApi } from "../lib/api/events";
import { queueApi } from "../lib/api/queues";
import { DeleteAccountDialog } from "../features/auth/components/DeleteAccountDialog";
import DashboardPage from "../app/organizer/dashboard/page";
import OrganizerSettingsPage from "../app/organizer/settings/page";
import { useWebSocket } from "../hooks/useWebSocket";
import { renderHook } from "@testing-library/react";

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/organizer/settings",
}));

// Mock WebSocket
class MockWebSocket {
  url: string;
  readyState: number = 0;
  onopen: any = null;
  onmessage: any = null;
  onclose: any = null;
  onerror: any = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) this.onopen();
    }, 10);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }

  static instances: MockWebSocket[] = [];
  static clear() {
    MockWebSocket.instances = [];
  }
}
// @ts-ignore
global.WebSocket = MockWebSocket;

describe("Organizer Account Deletion & Stale State Isolation Suite", () => {
  let queryClient = getQueryClient();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    useAuthStore.getState().clearAuth();
    useAuthStore.setState({ _hasHydrated: true });
    MockWebSocket.clear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // ==========================================
  // Test 1: Dialog UI and Safety Validations
  // ==========================================
  it("renders delete confirmation warning, requires password, and disables submit when empty", () => {
    const onOpenChange = vi.fn();
    render(<DeleteAccountDialog open={true} onOpenChange={onOpenChange} />, { wrapper });

    expect(screen.getByText("Delete your Skipline account?")).toBeTruthy();
    expect(
      screen.getByText(/This will permanently delete your organizer account along with all of your events/i)
    ).toBeTruthy();
    expect(screen.getByText(/This action cannot be undone/i)).toBeTruthy();

    const submitBtn = screen.getByRole("button", { name: /Delete my account permanently/i });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    const passwordInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(passwordInput, { target: { value: "   " } });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(passwordInput, { target: { value: "MySecret123" } });
    expect((submitBtn as HTMLButtonElement).disabled).toBe(false);
  });

  // ==========================================
  // Test 2: Cancel preserves session
  // ==========================================
  it("cancelling the dialog does not delete account or tear down session", () => {
    const userA = {
      id: "org-a",
      name: "Organizer A",
      email: "a@test.com",
      status: "ACTIVE",
      emailVerifiedAt: new Date().toISOString(),
    };
    useAuthStore.getState().setAuth(userA, "token-a");

    const onOpenChange = vi.fn();
    render(<DeleteAccountDialog open={true} onOpenChange={onOpenChange} />, { wrapper });

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(useAuthStore.getState().user?.id).toBe("org-a");
    expect(useAuthStore.getState().accessToken).toBe("token-a");
  });

  // ==========================================
  // Test 3: Rejection on incorrect password
  // ==========================================
  it("displays server error message on wrong password and preserves authenticated session", async () => {
    const userA = {
      id: "org-a",
      name: "Organizer A",
      email: "a@test.com",
      status: "ACTIVE",
      emailVerifiedAt: new Date().toISOString(),
    };
    useAuthStore.getState().setAuth(userA, "token-a");

    vi.spyOn(authApi, "deleteAccount").mockRejectedValueOnce({
      response: {
        status: 400,
        data: { error: { message: "Invalid password. Account deletion aborted." } },
      },
    });

    const onOpenChange = vi.fn();
    render(<DeleteAccountDialog open={true} onOpenChange={onOpenChange} />, { wrapper });

    const passwordInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(passwordInput, { target: { value: "WrongPassword" } });

    const submitBtn = screen.getByRole("button", { name: /Delete my account permanently/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Invalid password. Account deletion aborted.");
    });

    // Session remains intact
    expect(useAuthStore.getState().user?.id).toBe("org-a");
    expect(useAuthStore.getState().accessToken).toBe("token-a");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  // ==========================================
  // Test 4: Successful Account Deletion Flow
  // ==========================================
  it("calls deleteAccount API, tears down session, and redirects to '/'", async () => {
    const userA = {
      id: "org-a",
      name: "Organizer A",
      email: "a@test.com",
      status: "ACTIVE",
      emailVerifiedAt: new Date().toISOString(),
    };
    useAuthStore.getState().setAuth(userA, "token-a");

    const deleteSpy = vi.spyOn(authApi, "deleteAccount").mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: "Organizer account and all associated data permanently deleted" },
    } as any);

    const onOpenChange = vi.fn();
    render(<DeleteAccountDialog open={true} onOpenChange={onOpenChange} />, { wrapper });

    const passwordInput = screen.getByPlaceholderText("••••••••");
    fireEvent.change(passwordInput, { target: { value: "CorrectPassword123" } });

    const submitBtn = screen.getByRole("button", { name: /Delete my account permanently/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("CorrectPassword123");
    });

    await waitFor(() => {
      // Auth store cleared
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().accessToken).toBeNull();
      // Redirected to "/"
      expect(mockReplace).toHaveBeenCalledWith("/");
      // Dialog closed
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  // ==========================================
  // Test 5: CRITICAL STALE-STATE REGRESSION: Account A deletes -> Account B logs in
  // ==========================================
  it("CRITICAL: Account A deletes account, Account B logs in -> Dashboard contains ONLY Account B data and NEVER Account A data", async () => {
    const userA = {
      id: "user-a-uuid",
      name: "Organizer A",
      email: "a@enterprise.com",
      status: "ACTIVE",
      emailVerifiedAt: new Date().toISOString(),
    };
    const userB = {
      id: "user-b-uuid",
      name: "Organizer B",
      email: "b@startup.io",
      status: "ACTIVE",
      emailVerifiedAt: new Date().toISOString(),
    };

    const eventsA = [
      {
        id: "evt-a1",
        name: "Account A Confidential Launch",
        status: "LIVE",
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
      },
    ];

    const eventsB = [
      {
        id: "evt-b1",
        name: "Account B Community Meetup",
        status: "LIVE",
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
      },
    ];

    // Step 1: Account A is logged in and views Dashboard
    useAuthStore.getState().setAuth(userA, "token-a");
    const getEventsSpy = vi.spyOn(eventApi, "getAll").mockResolvedValueOnce({ data: eventsA } as any);

    const { unmount } = render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Account A Confidential Launch")).toBeTruthy();
    });

    // Step 2: Account A navigates to settings / triggers delete account
    unmount();

    vi.spyOn(authApi, "deleteAccount").mockResolvedValueOnce({
      status: 200,
      data: { success: true },
    } as any);

    // Perform the complete deletion teardown that DeleteAccountDialog executes
    await authApi.deleteAccount("ValidPasswordA123");
    await teardownOrganizerSession();

    // Verify cache and auth store are completely purged
    expect(queryClient.getQueryCache().getAll().length).toBe(0);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();

    // Step 3: Account B logs in
    useAuthStore.getState().setAuth(userB, "token-b");
    getEventsSpy.mockResolvedValueOnce({ data: eventsB } as any);

    render(<DashboardPage />, { wrapper });

    // Step 4: Account B's dashboard must contain ONLY Account B's data
    await waitFor(() => {
      expect(screen.getByText("Account B Community Meetup")).toBeTruthy();
    });

    // CRITICAL SECURITY ASSERTION: Account A data MUST NEVER be rendered or present in query cache
    expect(screen.queryByText("Account A Confidential Launch")).toBeNull();
    expect(queryClient.getQueryData(["events", "evt-a1"])).toBeUndefined();
  });

  // ==========================================
  // Test 6: CRITICAL STALE-STATE REGRESSION: Account B has 0 events
  // ==========================================
  it("CRITICAL: Account A deletes account, Account B (0 events) logs in -> Renders clean empty state and NEVER Account A data", async () => {
    const userA = {
      id: "user-a-super",
      name: "Organizer A",
      email: "a@rich.com",
      status: "ACTIVE",
      emailVerifiedAt: new Date().toISOString(),
    };
    const userB = {
      id: "user-b-empty",
      name: "Organizer B",
      email: "b@empty.com",
      status: "ACTIVE",
      emailVerifiedAt: new Date().toISOString(),
    };

    const eventsA = [
      {
        id: "evt-super-1",
        name: "Super Secret VIP Festival",
        status: "LIVE",
        startAt: new Date().toISOString(),
        endAt: new Date().toISOString(),
      },
    ];
    const eventsB: any[] = []; // Zero events

    // Step 1: Account A views events
    useAuthStore.getState().setAuth(userA, "token-a");
    const getEventsSpy = vi.spyOn(eventApi, "getAll").mockResolvedValueOnce({ data: eventsA } as any);

    const { unmount } = render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Super Secret VIP Festival")).toBeTruthy();
    });

    // Step 2: Account A deletes account
    unmount();
    await teardownOrganizerSession();

    // Step 3: Account B logs in with zero events
    useAuthStore.getState().setAuth(userB, "token-b");
    getEventsSpy.mockResolvedValueOnce({ data: eventsB } as any);

    render(<DashboardPage />, { wrapper });

    // Step 4: Expect empty state
    await waitFor(() => {
      expect(screen.getByText(/Your first event starts here/i)).toBeTruthy();
    });

    // Must never render Account A events
    expect(screen.queryByText("Super Secret VIP Festival")).toBeNull();
  });

  // ==========================================
  // Test 7: Active WebSocket Disconnection on Account Deletion
  // ==========================================
  it("closes active WebSocket connections immediately when account session is torn down", () => {
    useAuthStore.getState().setAuth(
      { id: "org-del-ws", name: "Organizer WS", email: "ws@del.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() },
      "ws-token-to-delete"
    );

    const { result, unmount } = renderHook(() => useWebSocket("queue-active-del", true), { wrapper });
    expect(result.current.connectionState).toBe("connecting");
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toContain("token=ws-token-to-delete");

    // Execute account deletion teardown
    act(() => {
      useAuthStore.getState().clearAuth();
    });

    // Sockets closed immediately
    expect(MockWebSocket.instances[0].readyState).toBe(3); // CLOSED

    unmount();
  });

  // ==========================================
  // Test 8: Settings page opens DeleteAccountDialog
  // ==========================================
  it("renders Settings page with Organizer profile and Danger Zone trigger", () => {
    useAuthStore.getState().setAuth(
      { id: "org-settings", name: "Jane Organizer", email: "jane@settings.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() },
      "settings-token"
    );

    render(<OrganizerSettingsPage />, { wrapper });

    expect(screen.getByText("Account Settings")).toBeTruthy();
    expect(screen.getByText("Jane Organizer")).toBeTruthy();
    expect(screen.getByText("jane@settings.com")).toBeTruthy();
    expect(screen.getByText("Danger Zone")).toBeTruthy();

    const deleteBtn = screen.getByRole("button", { name: /Delete Account/i });
    fireEvent.click(deleteBtn);

    // Dialog opens
    expect(screen.getByText("Delete your Skipline account?")).toBeTruthy();
  });
});
