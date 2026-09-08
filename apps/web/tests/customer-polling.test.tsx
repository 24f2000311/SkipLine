import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCustomerStatus } from '../features/customer/hooks/useCustomerQueue';
import { useCustomerStore } from '../features/customer/stores/useCustomerStore';
import { customerApi } from '../lib/api/customer';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

vi.mock('../lib/api/customer');

describe('Customer Polling', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    useCustomerStore.setState({
      entries: {
        'test-queue': { entryId: 'test-entry', token: 'test-token' },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('polls every 5 seconds for non-terminal states (WAITING)', async () => {
    vi.mocked(customerApi.getStatus).mockResolvedValue({ data: { status: 'WAITING' } } as any);

    const { result } = renderHook(() => useCustomerStatus('test-queue'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customerApi.getStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(5500);
    });
    
    await waitFor(() => expect(customerApi.getStatus).toHaveBeenCalledTimes(2));
  });

  it('stops polling for terminal states (COMPLETED)', async () => {
    vi.mocked(customerApi.getStatus).mockResolvedValue({ data: { status: 'COMPLETED' } } as any);

    const { result } = renderHook(() => useCustomerStatus('test-queue'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(customerApi.getStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(15500); // Wait multiple intervals
    });
    
    expect(customerApi.getStatus).toHaveBeenCalledTimes(1);
  });

  it('stops polling for terminal states (CANCELLED)', async () => {
    vi.mocked(customerApi.getStatus).mockResolvedValue({ data: { status: 'CANCELLED' } } as any);

    const { result } = renderHook(() => useCustomerStatus('test-queue'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      vi.advanceTimersByTime(10500);
    });
    
    expect(customerApi.getStatus).toHaveBeenCalledTimes(1);
  });

  it('stops polling for terminal states (SKIPPED)', async () => {
    vi.mocked(customerApi.getStatus).mockResolvedValue({ data: { status: 'SKIPPED' } } as any);

    const { result } = renderHook(() => useCustomerStatus('test-queue'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      vi.advanceTimersByTime(10500);
    });
    
    expect(customerApi.getStatus).toHaveBeenCalledTimes(1);
  });
});
