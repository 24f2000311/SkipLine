import { render } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWebSocket } from '../hooks/useWebSocket';
import { useParams } from 'next/navigation';

// Mocks
vi.mock('../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(),
}));

vi.mock('../features/queues/hooks/useQueues', () => ({
  useQueue: vi.fn().mockReturnValue({ data: {}, isLoading: false }),
  useUpdateQueue: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  usePublicQueue: vi.fn().mockReturnValue({ data: { _count: { entries: 0 }, event: {} }, isLoading: false }),
}));

vi.mock('../features/queue-entries/hooks/useQueueEntries', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useCallNext: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
    useStartServing: vi.fn(),
    useCompleteService: vi.fn(),
    useNoShow: vi.fn(),
    useActiveEntries: vi.fn().mockReturnValue({ data: [], isLoading: false, error: null }),
    useAddWalkIn: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  };
});

vi.mock('../features/customer/hooks/useCustomerQueue', () => ({
  useJoinQueue: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  useLeaveQueue: vi.fn().mockReturnValue({ mutate: vi.fn(), isPending: false }),
  useCustomerStatus: vi.fn().mockReturnValue({ data: null, isLoading: false }),
}));

vi.mock('../features/customer/stores/useCustomerStore', () => ({
  useCustomerStore: vi.fn().mockImplementation((selector) => selector({ entries: {} })),
}));

// Mock components that might fail rendering
vi.mock('../features/queue-entries/components/QueueEntriesTable', () => ({
  QueueEntriesTable: () => <div data-testid="queue-entries-table" />
}));

vi.mock('../features/queues/components/ShareQrDialog', () => ({
  ShareQrDialog: () => <div data-testid="share-qr-dialog" />
}));

vi.mock('next/link', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Import the components under test
import QueueDetailsPage from '../app/organizer/events/[id]/queues/[queueId]/page';
import CustomerQueuePage from '../app/(customer)/q/[queueId]/page';

describe('WebSocket Integration in Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Organizer QueueDetailsPage', () => {
    it('establishes WebSocket connection with correct queueId', () => {
      vi.mocked(useParams).mockReturnValue({ id: 'event-1', queueId: 'queue-123' });
      
      render(<QueueDetailsPage />);
      
      // Verify useWebSocket was called with the correct queueId
      expect(useWebSocket).toHaveBeenCalledWith('queue-123');
    });
  });

  describe('Customer CustomerQueuePage', () => {
    it('establishes WebSocket connection with correct queueId', () => {
      vi.mocked(useParams).mockReturnValue({ queueId: 'queue-456' });
      
      render(<CustomerQueuePage />);
      
      // Verify useWebSocket was called with the correct queueId
      expect(useWebSocket).toHaveBeenCalledWith('queue-456', expect.any(Boolean));
    });
  });
});
