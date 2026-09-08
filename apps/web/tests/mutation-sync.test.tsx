import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useCallNext,
  useStartServing,
  useCompleteService,
  useNoShow,
} from '../features/queue-entries/hooks/useQueueEntries';
import { useJoinQueue, useLeaveQueue } from '../features/customer/hooks/useCustomerQueue';
import { queueEntryApi } from '../lib/api/queue-entries';
import { customerApi } from '../lib/api/customer';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../lib/api/queue-entries');
vi.mock('../lib/api/customer');

describe('Mutation Synchronization', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('callNext invalidates queue-entries and queue queries', async () => {
    vi.mocked(queueEntryApi.callNext).mockResolvedValue({ data: {} } as any);

    const { result } = renderHook(() => useCallNext(), { wrapper });

    result.current.mutate('queue-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['queue-entries', 'queue-123'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['queue', 'queue-123'] });
  });

  it('startServing invalidates queue-entries query', async () => {
    vi.mocked(queueEntryApi.startServing).mockResolvedValue({ data: {} } as any);

    const { result } = renderHook(() => useStartServing(), { wrapper });

    result.current.mutate({ entryId: 'entry-123', queueId: 'queue-123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['queue-entries', 'queue-123'] });
  });

  it('completeService invalidates queue-entries and queue queries', async () => {
    vi.mocked(queueEntryApi.completeService).mockResolvedValue({ data: {} } as any);

    const { result } = renderHook(() => useCompleteService(), { wrapper });

    result.current.mutate({ entryId: 'entry-123', queueId: 'queue-123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['queue-entries', 'queue-123'] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['queue', 'queue-123'] });
  });

  it('noShow invalidates queue-entries query', async () => {
    vi.mocked(queueEntryApi.handleNoShow).mockResolvedValue({ data: {} } as any);

    const { result } = renderHook(() => useNoShow(), { wrapper });

    result.current.mutate({ entryId: 'entry-123', queueId: 'queue-123' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['queue-entries', 'queue-123'] });
  });

  it('joinQueue invalidates customer-status query', async () => {
    vi.mocked(customerApi.joinQueue).mockResolvedValue({ data: { entry: { id: 'entry-123' }, accessToken: 'token' } } as any);

    const { result } = renderHook(() => useJoinQueue(), { wrapper });

    result.current.mutate({ queueId: 'queue-123', data: { customerName: 'Test', customerPhone: '' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['customer-status', 'entry-123'] });
  });

  it('leaveQueue invalidates customer-status query', async () => {
    vi.mocked(customerApi.leaveQueue).mockResolvedValue({ data: {} } as any);

    const { result } = renderHook(() => useLeaveQueue(), { wrapper });

    result.current.mutate({ queueId: 'queue-123', entryId: 'entry-123', token: 'token' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['customer-status', 'entry-123'] });
  });
});
