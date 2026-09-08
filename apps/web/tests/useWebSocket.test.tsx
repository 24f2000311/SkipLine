import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../stores/useAuthStore';
import { useCustomerStore } from '../features/customer/stores/useCustomerStore';

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(),
}));

vi.mock('../stores/useAuthStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../features/customer/stores/useCustomerStore', () => ({
  useCustomerStore: vi.fn(),
}));

class MockWebSocket {
  url: string;
  readyState: number = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onerror: (() => void) | null = null;
  sentMessages: string[] = [];
  closed: boolean = false;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3; // CLOSED
    if (this.onclose) this.onclose();
  }

  // Helpers for testing
  simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) this.onopen();
  }

  simulateMessage(data: string) {
    if (this.onmessage) this.onmessage({ data });
  }

  simulateClose() {
    this.readyState = 3;
    if (this.onclose) this.onclose();
  }

  static instances: MockWebSocket[] = [];
  static clear() {
    MockWebSocket.instances = [];
  }
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
}

// @ts-ignore
global.WebSocket = MockWebSocket;

describe('useWebSocket', () => {
  let mockInvalidateQueries: any;

  beforeEach(() => {
    MockWebSocket.clear();
    mockInvalidateQueries = vi.fn();
    (useQueryClient as any).mockReturnValue({
      invalidateQueries: mockInvalidateQueries,
    });
    (useAuthStore as any).mockImplementation((selector: any) => selector({ accessToken: null }));
    (useCustomerStore as any).mockImplementation((selector: any) => selector({ entries: {} }));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('connects to websocket on mount if queueId is provided', () => {
    const { result } = renderHook(() => useWebSocket('queue-123'));
    
    expect(result.current.connectionState).toBe('connecting');
    expect(MockWebSocket.instances.length).toBe(1);
    expect(MockWebSocket.instances[0].url).toContain('/ws');
  });

  it('does not connect if queueId is missing', () => {
    const { result } = renderHook(() => useWebSocket(undefined));
    
    expect(result.current.connectionState).toBe('disconnected');
    expect(MockWebSocket.instances.length).toBe(0);
  });

  it('authenticates organizer by passing token in URL', () => {
    (useAuthStore as any).mockImplementation((selector: any) => selector({ accessToken: 'org-token' }));
    renderHook(() => useWebSocket('queue-123'));
    
    expect(MockWebSocket.instances[0].url).toContain('token=org-token');
  });

  it('subscribes with customer token after OPEN', () => {
    (useCustomerStore as any).mockImplementation((selector: any) => 
      selector({ entries: { 'queue-123': { entryId: 'e1', token: 'cust-token' } } })
    );

    const { result } = renderHook(() => useWebSocket('queue-123'));
    const ws = MockWebSocket.instances[0];
    
    act(() => {
      ws.simulateOpen();
    });

    expect(result.current.connectionState).toBe('connected');
    expect(ws.sentMessages.length).toBe(1);
    expect(JSON.parse(ws.sentMessages[0])).toEqual({
      action: 'SUBSCRIBE',
      queueId: 'queue-123',
      accessToken: 'cust-token',
    });
  });

  it('unsubscribe and cleanup on unmount', () => {
    const { unmount } = renderHook(() => useWebSocket('queue-123'));
    const ws = MockWebSocket.instances[0];
    
    act(() => {
      ws.simulateOpen();
    });

    unmount();

    expect(ws.sentMessages[1]).toContain('"action":"UNSUBSCRIBE"');
    expect(ws.closed).toBe(true);
  });

  it('invalidates relevant queries on QUEUE_UPDATED', () => {
    renderHook(() => useWebSocket('queue-123'));
    const ws = MockWebSocket.instances[0];
    
    act(() => {
      ws.simulateOpen();
      ws.simulateMessage(JSON.stringify({ event: 'QUEUE_UPDATED', queueId: 'queue-123' }));
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["queue", "queue-123"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["public-queue", "queue-123"] });
  });

  it('invalidates relevant queries on QUEUE_ENTRY_UPDATED', () => {
    renderHook(() => useWebSocket('queue-123'));
    const ws = MockWebSocket.instances[0];
    
    act(() => {
      ws.simulateOpen();
      ws.simulateMessage(JSON.stringify({ 
        event: 'QUEUE_ENTRY_UPDATED', 
        queueId: 'queue-123',
        data: { entryId: 'entry-1' }
      }));
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["queue-entries", "queue-123"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["customer-status", "entry-1"] });
  });

  it('safely ignores unknown events', () => {
    renderHook(() => useWebSocket('queue-123'));
    const ws = MockWebSocket.instances[0];
    
    act(() => {
      ws.simulateOpen();
      ws.simulateMessage(JSON.stringify({ event: 'UNKNOWN_EVENT' }));
    });

    // Invalidation only called for the initial reconnect resync
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2); // Initial queue and queue-entries resync
  });

  it('safely handles malformed messages', () => {
    renderHook(() => useWebSocket('queue-123'));
    const ws = MockWebSocket.instances[0];
    
    act(() => {
      ws.simulateOpen();
    });
    
    mockInvalidateQueries.mockClear();

    act(() => {
      ws.simulateMessage("invalid json {");
    });

    // Should not crash and no queries invalidated
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(0);
  });

  it('reconnects with exponential backoff on close', () => {
    const { result } = renderHook(() => useWebSocket('queue-123'));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateClose();
    });

    expect(result.current.connectionState).toBe('disconnected');
    
    act(() => {
      vi.advanceTimersByTime(1000); // 1st retry
    });
    
    expect(MockWebSocket.instances.length).toBe(2);

    const ws2 = MockWebSocket.instances[1];
    act(() => {
      ws2.simulateClose();
    });

    act(() => {
      vi.advanceTimersByTime(2000); // 2nd retry
    });

    expect(MockWebSocket.instances.length).toBe(3);
  });

  it('triggers query invalidation/resync on successful reconnect', () => {
    (useCustomerStore as any).mockImplementation((selector: any) => 
      selector({ entries: { 'queue-123': { entryId: 'e1', token: 'cust-token' } } })
    );

    renderHook(() => useWebSocket('queue-123'));
    const ws = MockWebSocket.instances[0];

    act(() => {
      ws.simulateOpen();
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["queue", "queue-123"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["queue-entries", "queue-123"] });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["customer-status", "e1"] });
  });
});
