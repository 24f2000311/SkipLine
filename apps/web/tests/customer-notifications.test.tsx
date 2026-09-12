import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCustomerNotifications } from "../features/customer/hooks/useCustomerNotifications";
import { useCustomerStore } from "../features/customer/stores/useCustomerStore";

describe("Customer Call Notifications Regression Tests", () => {
  let urgentToneCount = 0;
  let calmToneCount = 0;
  let notificationCount = 0;

  beforeEach(() => {
    localStorage.clear();
    useCustomerStore.persist.clearStorage();
    useCustomerStore.setState({ entries: {} });

    urgentToneCount = 0;
    calmToneCount = 0;
    notificationCount = 0;

    // Mock Web Audio API
    const mockOscillator = {
      type: "sine",
      frequency: { setValueAtTime: vi.fn() },
      start: vi.fn(function (this: any) {
        if (this.type === "square") {
          urgentToneCount++;
        } else {
          calmToneCount++;
        }
      }),
      stop: vi.fn(),
      connect: vi.fn(),
    };

    const mockGain = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    function MockAudioContext(this: any) {
      this.currentTime = 0;
      this.destination = {};
      this.createOscillator = () => mockOscillator;
      this.createGain = () => mockGain;
    }

    (window as any).AudioContext = MockAudioContext;
    (window as any).webkitAudioContext = MockAudioContext;

    // Mock HTML5 Notification API
    function MockNotification(this: any, title: string, options: any) {
      notificationCount++;
      this.title = title;
      Object.assign(this, options);
    }
    (MockNotification as any).permission = "granted";
    (window as any).Notification = MockNotification;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("triggers notification on 1st CALL, suppresses on No-Show & poll, and triggers AGAIN on 2nd & 3rd CALL", () => {
    const queueId = "test-queue-1";
    useCustomerStore.getState().saveEntry(queueId, "entry-1", "token-1");

    // 1. Initial State: WAITING (position 5)
    const { rerender } = renderHook(
      ({ status }: { status: any }) => useCustomerNotifications(queueId, status),
      {
        initialProps: {
          status: {
            entry: { status: "WAITING", callCount: 0 },
            position: 5,
          } as any,
        },
      }
    );

    expect(urgentToneCount).toBe(0);
    expect(notificationCount).toBe(0);

    // 2. First CALL (WAITING -> CALLED, callCount = 1)
    rerender({
      status: {
        entry: { status: "CALLED", callCount: 1, calledAt: new Date().toISOString() },
        position: 0,
      },
    });

    expect(urgentToneCount).toBe(1);
    expect(notificationCount).toBe(1);
    expect(useCustomerStore.getState().entries[queueId].lastNotifiedCallCount).toBe(1);

    // 3. Polling / refetch while CALLED (same callCount = 1)
    rerender({
      status: {
        entry: { status: "CALLED", callCount: 1, calledAt: new Date().toISOString() },
        position: 0,
      },
    });

    // Count MUST NOT increase on duplicate polling
    expect(urgentToneCount).toBe(1);
    expect(notificationCount).toBe(1);

    // 4. Organizer marks No Show (CALLED -> WAITING, callCount remains 1, noShowCount = 1)
    // Participant is requeued further back in line (e.g. position 8)
    rerender({
      status: {
        entry: { status: "WAITING", callCount: 1, noShowCount: 1 },
        position: 8,
      },
    });

    // Turning back to WAITING must NOT ring urgent turn notification
    expect(urgentToneCount).toBe(1);
    expect(notificationCount).toBe(1);

    // 5. Second CALL after No Show (WAITING -> CALLED, callCount = 2)
    rerender({
      status: {
        entry: { status: "CALLED", callCount: 2, calledAt: new Date().toISOString() },
        position: 0,
      },
    });

    // Second CALL must ring AGAIN!
    expect(urgentToneCount).toBe(2);
    expect(notificationCount).toBe(2);
    expect(useCustomerStore.getState().entries[queueId].lastNotifiedCallCount).toBe(2);

    // 6. Polling again on 2nd CALL must not trigger duplicate
    rerender({
      status: {
        entry: { status: "CALLED", callCount: 2, calledAt: new Date().toISOString() },
        position: 0,
      },
    });
    expect(urgentToneCount).toBe(2);

    // 7. Third CALL (e.g. after second no-show, callCount = 3)
    rerender({
      status: {
        entry: { status: "CALLED", callCount: 3, calledAt: new Date().toISOString() },
        position: 0,
      },
    });

    // Third CALL must ring AGAIN!
    expect(urgentToneCount).toBe(3);
    expect(notificationCount).toBe(3);
    expect(useCustomerStore.getState().entries[queueId].lastNotifiedCallCount).toBe(3);
  });

  it("page refresh / reconnect does not continuously replay an already notified CALL", () => {
    const queueId = "test-queue-refresh";

    // Simulate entry already in localStorage with lastNotifiedCallCount = 2
    useCustomerStore.getState().saveEntry(queueId, "entry-2", "token-2");
    useCustomerStore.getState().updateNotificationState(queueId, {
      lastNotifiedCallCount: 2,
      notifiedCalled: true,
      acknowledgedCallCount: 2,
    });

    // Fresh mount (simulating full page refresh or WebSocket reconnect)
    renderHook(() =>
      useCustomerNotifications(queueId, {
        entry: { status: "CALLED", callCount: 2 },
        position: 0,
      })
    );

    // Should NOT replay the sound or notification
    expect(urgentToneCount).toBe(0);
    expect(notificationCount).toBe(0);
  });

  it("acknowledgment state resets for a genuinely new call cycle", () => {
    const queueId = "test-queue-ack";
    useCustomerStore.getState().saveEntry(queueId, "entry-3", "token-3");

    const { rerender } = renderHook(
      ({ status }: { status: any }) => useCustomerNotifications(queueId, status),
      {
        initialProps: {
          status: {
            entry: { status: "CALLED", callCount: 1 },
            position: 0,
          } as any,
        },
      }
    );

    // User acknowledges Call #1
    act(() => {
      useCustomerStore.getState().updateNotificationState(queueId, {
        acknowledgedCalled: true,
        acknowledgedCallCount: 1,
      });
    });

    expect(useCustomerStore.getState().entries[queueId].acknowledgedCallCount).toBe(1);

    // Call #2 arrives
    rerender({
      status: {
        entry: { status: "CALLED", callCount: 2 },
        position: 0,
      },
    });

    // Acknowledged state for Call #2 must be reset to undefined / false
    const entryState = useCustomerStore.getState().entries[queueId];
    expect(entryState.lastNotifiedCallCount).toBe(2);
    expect(entryState.acknowledgedCallCount).toBeUndefined();
    expect(entryState.acknowledgedCalled).toBe(false);
  });
});
