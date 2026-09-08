import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCustomerStatus } from '../features/customer/hooks/useCustomerQueue';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCustomerStore } from '../features/customer/stores/useCustomerStore';
import { customerApi } from '../lib/api/customer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

vi.mock('../lib/api/customer');

class MockWebSocket {
  onopen: any;
  onclose: any;
  readyState = 0;
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];
  
  constructor() {
    MockWebSocket.instances.push(this);
  }
  send() {}
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

describe('WebSocket Fallback to Polling', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    useCustomerStore.setState({
      entries: {
        'test-queue': { entryId: 'test-entry', token: 'test-token' },
      },
    });
    vi.clearAllMocks();
    
    global.WebSocket = MockWebSocket as any;
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('proves REST polling path remains functional during and after WS disconnect', async () => {
    vi.mocked(customerApi.getStatus).mockResolvedValue({ data: { status: 'WAITING' } } as any);

    // Simulate what happens in the CustomerQueuePage
    const usePageHooks = () => {
       useWebSocket('test-queue');
       return useCustomerStatus('test-queue');
    };

    const { result } = renderHook(() => usePageHooks(), { wrapper });

    // Initial query fetch should occur
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customerApi.getStatus).toHaveBeenCalledTimes(1);

    // Get the WebSocket instance that useWebSocket created
    const ws = MockWebSocket.instances[0];
    
    // Simulate WebSocket connection open
    await act(async () => {
       ws.readyState = 1;
       ws.onopen?.();
    });

    // Advance 5 seconds - Polling should trigger regardless of WS connected state
    await act(async () => {
       vi.advanceTimersByTime(5000);
    });
    
    // Initial (1) + Invalidation on open (1) + Polling (1) = 3
    expect(customerApi.getStatus).toHaveBeenCalledTimes(3);

    // Simulate unexpected WebSocket disconnect
    await act(async () => {
       ws.close();
    });
    
    // Advance another 5 seconds - Polling should STILL trigger since WS disconnected
    await act(async () => {
       vi.advanceTimersByTime(5000);
    });
    
    expect(customerApi.getStatus).toHaveBeenCalledTimes(4);
  });
});
