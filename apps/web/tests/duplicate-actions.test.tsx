import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueueEntriesTable } from '../features/queue-entries/components/QueueEntriesTable';
import * as useQueueEntries from '../features/queue-entries/hooks/useQueueEntries';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('../features/queue-entries/hooks/useQueueEntries', async (importOriginal) => {
  const actual = await importOriginal<typeof useQueueEntries>();
  return {
    ...actual,
    useActiveEntries: vi.fn(),
    useStartServing: vi.fn(),
    useCompleteService: vi.fn(),
    useNoShow: vi.fn(),
  };
});

describe('Duplicate Actions (Disabled Buttons)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('disables "Start Serving" button when mutation is pending', () => {
    vi.mocked(useQueueEntries.useActiveEntries).mockReturnValue({
      data: [{ id: '1', status: 'CALLED', sequenceNumber: 1, customerName: 'Test' }],
      isLoading: false,
    } as any);

    // Mock start serving as pending
    vi.mocked(useQueueEntries.useStartServing).mockReturnValue({
      mutate: vi.fn(),
      isPending: true, // This is the important part
    } as any);

    vi.mocked(useQueueEntries.useCompleteService).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(useQueueEntries.useNoShow).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);

    render(<QueueEntriesTable queueId="queue-123" />, { wrapper });

    const startButton = screen.getByText('Start Serving');
    expect(startButton.hasAttribute('disabled')).toBe(true);
  });

  it('disables "Complete" button when mutation is pending', () => {
    vi.mocked(useQueueEntries.useActiveEntries).mockReturnValue({
      data: [{ id: '1', status: 'SERVING', sequenceNumber: 1, customerName: 'Test' }],
      isLoading: false,
    } as any);

    vi.mocked(useQueueEntries.useStartServing).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    
    // Mock complete service as pending
    vi.mocked(useQueueEntries.useCompleteService).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as any);
    
    vi.mocked(useQueueEntries.useNoShow).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);

    render(<QueueEntriesTable queueId="queue-123" />, { wrapper });

    const completeButton = screen.getByText('Complete');
    expect(completeButton.hasAttribute('disabled')).toBe(true);
  });

  it('disables "No-Show" button when mutation is pending', () => {
    vi.mocked(useQueueEntries.useActiveEntries).mockReturnValue({
      data: [{ id: '1', status: 'CALLED', sequenceNumber: 1, customerName: 'Test' }],
      isLoading: false,
    } as any);

    vi.mocked(useQueueEntries.useStartServing).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    vi.mocked(useQueueEntries.useCompleteService).mockReturnValue({ mutate: vi.fn(), isPending: false } as any);
    
    // Mock no-show as pending
    vi.mocked(useQueueEntries.useNoShow).mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as any);

    render(<QueueEntriesTable queueId="queue-123" />, { wrapper });

    const noShowButton = screen.getByText('No-Show');
    expect(noShowButton.hasAttribute('disabled')).toBe(true);
  });
});
