import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "../lib/queryClient";
import { useAuthStore } from "../stores/useAuthStore";
import { useCustomerStore } from "../features/customer/stores/useCustomerStore";
import { teardownOrganizerSession } from "../lib/auth-session";
import { apiClient } from "../lib/api/client";
import { eventApi } from "../lib/api/events";
import { queueApi } from "../lib/api/queues";
import DashboardPage from "../app/organizer/dashboard/page";
import { useWebSocket } from "../hooks/useWebSocket";
import { renderHook } from "@testing-library/react";
import axios from "axios";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => "/organizer/dashboard",
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

describe("Account Switching & Cache Isolation Security Suite", () => {
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
  // Test 1: Basic Account Switch
  // ==========================================
  it("Test 1: Completely isolates query cache on account switch", async () => {
    const userA = { id: "user-a-123", name: "Organizer A", email: "a@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };
    const userB = { id: "user-b-456", name: "Organizer B", email: "b@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };

    const eventsA = [
      { id: "evt-a", name: "Account A Private Event", status: "LIVE", startAt: new Date().toISOString(), endAt: new Date().toISOString() }
    ];
    const eventsB = [
      { id: "evt-b", name: "Account B Private Event", status: "LIVE", startAt: new Date().toISOString(), endAt: new Date().toISOString() }
    ];

    // 1. Login Account A
    useAuthStore.getState().setAuth(userA, "token-a");
    const getEventsSpy = vi.spyOn(eventApi, "getAll").mockResolvedValueOnce({ data: eventsA } as any);

    const { unmount } = render(<DashboardPage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("Account A Private Event")).toBeTruthy();
    });

    // 2. Logout Account A
    unmount();
    await teardownOrganizerSession();

    // Confirm query cache is completely emptied
    expect(queryClient.getQueryCache().getAll().length).toBe(0);

    // 3. Login Account B
    useAuthStore.getState().setAuth(userB, "token-b");
    getEventsSpy.mockResolvedValueOnce({ data: eventsB } as any);

    render(<DashboardPage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("Account B Private Event")).toBeTruthy();
    });

    // CRITICAL SECURITY ASSERTION: Account A data is never displayed to Account B
    expect(screen.queryByText("Account A Private Event")).toBeNull();
  });

  // ==========================================
  // Test 2: Different Event Datasets
  // ==========================================
  it("Test 2: Renders Tech Workshop for Account B and NEVER renders College Fest", async () => {
    const userA = { id: "org-a", name: "Organizer A", email: "fest@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };
    const userB = { id: "org-b", name: "Organizer B", email: "tech@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };

    const eventsA = [{ id: "evt-fest", name: "College Fest", status: "LIVE", startAt: new Date().toISOString(), endAt: new Date().toISOString() }];
    const eventsB = [{ id: "evt-tech", name: "Tech Workshop", status: "LIVE", startAt: new Date().toISOString(), endAt: new Date().toISOString() }];

    useAuthStore.getState().setAuth(userA, "token-fest");
    vi.spyOn(eventApi, "getAll").mockResolvedValueOnce({ data: eventsA } as any);

    const { unmount } = render(<DashboardPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("College Fest")).toBeTruthy());

    unmount();
    await teardownOrganizerSession();

    useAuthStore.getState().setAuth(userB, "token-tech");
    vi.spyOn(eventApi, "getAll").mockResolvedValueOnce({ data: eventsB } as any);

    render(<DashboardPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Tech Workshop")).toBeTruthy());

    expect(screen.queryByText("College Fest")).toBeNull();
  });

  // ==========================================
  // Test 3: Empty Account B (CRITICAL)
  // ==========================================
  it("Test 3: Shows empty state for Account B (0 events) and NEVER shows Account A events", async () => {
    const userA = { id: "org-rich", name: "Rich Org", email: "rich@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };
    const userB = { id: "org-empty", name: "Empty Org", email: "empty@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };

    const eventsA = [
      { id: "e1", name: "Megacon 2026", status: "LIVE", startAt: new Date().toISOString(), endAt: new Date().toISOString() },
      { id: "e2", name: "Exclusive VIP Gala", status: "SCHEDULED", startAt: new Date().toISOString(), endAt: new Date().toISOString() }
    ];
    const eventsB: any[] = []; // Zero events!

    // Step 1: User A logs in and populates cache
    useAuthStore.getState().setAuth(userA, "token-a");
    vi.spyOn(eventApi, "getAll").mockResolvedValueOnce({ data: eventsA } as any);

    const { unmount } = render(<DashboardPage />, { wrapper });
    await waitFor(() => expect(screen.getByText("Megacon 2026")).toBeTruthy());
    expect(screen.getByText("Exclusive VIP Gala")).toBeTruthy();

    // Step 2: Logout
    unmount();
    await teardownOrganizerSession();

    // Step 3: User B logs in with zero events
    useAuthStore.getState().setAuth(userB, "token-b");
    vi.spyOn(eventApi, "getAll").mockResolvedValueOnce({ data: eventsB } as any);

    render(<DashboardPage />, { wrapper });

    // Step 4: Expect empty state
    await waitFor(() => {
      expect(screen.getByText(/Your first event starts here/i)).toBeTruthy();
    });

    // STRICT PRIVACY ASSERTIONS: Account A's events must NOT be rendered
    expect(screen.queryByText("Megacon 2026")).toBeNull();
    expect(screen.queryByText("Exclusive VIP Gala")).toBeNull();
  });

  // ==========================================
  // Test 4: Different Queue Data
  // ==========================================
  it("Test 4: Queue lists are isolated between organizers", async () => {
    const userA = { id: "user-qa", name: "User QA", email: "qa@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };
    const userB = { id: "user-qb", name: "User QB", email: "qb@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };

    useAuthStore.getState().setAuth(userA, "token-a");

    const queuesA = [{ id: "q1", name: "Registration Queue", eventId: "ev-1" }];
    const queuesB = [{ id: "q2", name: "Workshop Queue", eventId: "ev-1" }];

    vi.spyOn(queueApi, "getByEvent").mockResolvedValueOnce({ data: queuesA } as any);

    // Fetch as User A
    const resA = await queryClient.fetchQuery({
      queryKey: ["organizer-queues", userA.id, "ev-1"],
      queryFn: () => queueApi.getByEvent("ev-1").then((r) => r.data),
    });
    expect(resA).toEqual(queuesA);

    // Logout
    await teardownOrganizerSession();

    // Fetch as User B
    useAuthStore.getState().setAuth(userB, "token-b");
    vi.spyOn(queueApi, "getByEvent").mockResolvedValueOnce({ data: queuesB } as any);

    const resB = await queryClient.fetchQuery({
      queryKey: ["organizer-queues", userB.id, "ev-1"],
      queryFn: () => queueApi.getByEvent("ev-1").then((r) => r.data),
    });
    expect(resB).toEqual(queuesB);

    // User B's cache contains only queuesB
    const cachedDataB = queryClient.getQueryData(["organizer-queues", userB.id, "ev-1"]);
    expect(cachedDataB).toEqual(queuesB);
    // User A's cache key does not exist
    expect(queryClient.getQueryData(["organizer-queues", userA.id, "ev-1"])).toBeUndefined();
  });

  // ==========================================
  // Test 5: In-Flight Request Race
  // ==========================================
  it("Test 5: Late-arriving response from Account A is dropped and cannot overwrite Account B", async () => {
    const userA = { id: "user-a", name: "A", email: "a@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };
    const userB = { id: "user-b", name: "B", email: "b@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };

    useAuthStore.getState().setAuth(userA, "token-a");

    let resolveAccountARequest: any;
    const accountAPromise = new Promise((resolve) => {
      resolveAccountARequest = resolve;
    });

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = vi.fn().mockImplementation((config) => {
      if (config.headers?.Authorization?.includes("token-a")) {
        return accountAPromise;
      }
      return Promise.resolve({
        data: { data: [{ id: "b1", name: "Account B Event" }] },
        status: 200,
        config,
        headers: {},
      });
    });

    // Account A initiates in-flight request
    const pendingReqA = apiClient.get("/events");

    // Before Account A resolves, Account A logs out
    await teardownOrganizerSession();

    // Account B logs in
    useAuthStore.getState().setAuth(userB, "token-b");

    // Account B fires request
    const reqB = await apiClient.get("/events");
    expect((reqB as any).data[0].name).toBe("Account B Event");

    // Now Account A's pending request finishes
    resolveAccountARequest({
      data: { data: [{ id: "a1", name: "Account A Stale Event" }] },
      status: 200,
      config: { _sessionGeneration: 1, headers: {} },
      headers: {},
    });

    // The stale response must be rejected
    await expect(pendingReqA).rejects.toThrow(/session terminated/i);

    // Restore adapter
    apiClient.defaults.adapter = originalAdapter;
  });

  // ==========================================
  // Test 6: Refresh Token Race
  // ==========================================
  it("Test 6: Account A token refresh resolution cannot overwrite Account B session", async () => {
    const userA = { id: "user-a", name: "A", email: "a@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };
    const userB = { id: "user-b", name: "B", email: "b@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() };

    useAuthStore.getState().setAuth(userA, "token-a", "refresh-a");

    let resolveRefreshA: any;
    const refreshAPromise = new Promise((resolve) => {
      resolveRefreshA = resolve;
    });

    let refreshStartedResolve: any;
    const refreshStarted = new Promise((resolve) => {
      refreshStartedResolve = resolve;
    });

    const postSpy = vi.spyOn(axios, "post").mockImplementation((url) => {
      if (url.includes("/auth/refresh")) {
        refreshStartedResolve();
        return refreshAPromise as any;
      }
      return Promise.resolve({ data: {} });
    });

    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = vi.fn().mockImplementation((config) =>
      Promise.reject({
        response: { status: 401 },
        config,
      })
    );

    // Account A triggers 401
    const requestWith401 = apiClient.get("/protected");

    // Wait until refresh is actually initiated by Account A
    await refreshStarted;

    // Account A logs out while refresh is in flight
    await teardownOrganizerSession();

    // Account B logs in with new credentials
    useAuthStore.getState().setAuth(userB, "token-b", "refresh-b");

    // Account A's refresh resolves with Account A's new tokens
    resolveRefreshA({
      data: {
        data: {
          accessToken: "refreshed-token-a",
          refreshToken: "new-refresh-a",
        },
      },
    });

    // Catch the original rejected request
    await expect(requestWith401).rejects.toThrow();

    // Assert that Account B's credentials remain authoritative in useAuthStore
    const currentStore = useAuthStore.getState();
    expect(currentStore.user?.id).toBe("user-b");
    expect(currentStore.accessToken).toBe("token-b");
    expect(currentStore.refreshToken).toBe("refresh-b");

    // Refreshed token A must NOT have been written to the store
    expect(currentStore.accessToken).not.toBe("refreshed-token-a");

    apiClient.defaults.adapter = originalAdapter;
  });

  // ==========================================
  // Test 7: WebSocket Race & Teardown
  // ==========================================
  it("Test 7: WebSocket cleanly disconnects on logout and does not reconnect for previous user", () => {
    useAuthStore.getState().setAuth(
      { id: "org-ws", name: "Ws User", email: "ws@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() },
      "org-token-123"
    );

    const { result, unmount } = renderHook(() => useWebSocket("queue-test-1", true), { wrapper });
    expect(result.current.connectionState).toBe("connecting");
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toContain("token=org-token-123");

    // Logout
    act(() => {
      useAuthStore.getState().clearAuth();
    });

    // Verify WebSocket was closed
    expect(MockWebSocket.instances[0].readyState).toBe(3); // CLOSED

    unmount();
  });

  // ==========================================
  // Test 8: Customer Storage Preservation
  // ==========================================
  it("Test 8: Organizer session teardown preserves customer anonymous queue state", async () => {
    // Customer joins a queue and saves their ticket
    useCustomerStore.getState().saveEntry("queue-999", "entry-888", "customer-jwt-token");
    expect(useCustomerStore.getState().entries["queue-999"]).toBeDefined();
    expect(useCustomerStore.getState().entries["queue-999"].entryId).toBe("entry-888");

    // Organizer logs in
    useAuthStore.getState().setAuth(
      { id: "org-temp", name: "Organizer", email: "temp@test.com", status: "ACTIVE", emailVerifiedAt: new Date().toISOString() },
      "org-token"
    );

    // Organizer logs out
    await teardownOrganizerSession();

    // Verify organizer auth is cleared
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();

    // CRITICAL: Customer anonymous queue ticket is 100% PRESERVED
    expect(useCustomerStore.getState().entries["queue-999"]).toBeDefined();
    expect(useCustomerStore.getState().entries["queue-999"].entryId).toBe("entry-888");
    expect(useCustomerStore.getState().entries["queue-999"].token).toBe("customer-jwt-token");
  });
});
