import { describe, it, expect, beforeEach } from 'vitest';
import { useCustomerStore } from '../features/customer/stores/useCustomerStore';

describe('Customer Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useCustomerStore.persist.clearStorage();
    useCustomerStore.setState({ entries: {} });
  });

  it('persists customer entry to localStorage', () => {
    useCustomerStore.getState().saveEntry('queue-123', 'entry-456', 'token-789');

    // Retrieve from localStorage
    const stored = JSON.parse(localStorage.getItem('skipline-customer-storage') || '{}');
    
    expect(stored.state.entries).toHaveProperty('queue-123');
    expect(stored.state.entries['queue-123']).toEqual({
      entryId: 'entry-456',
      token: 'token-789',
    });
  });

  it('rehydrates customer entry from localStorage', () => {
    localStorage.setItem(
      'skipline-customer-storage',
      JSON.stringify({
        state: {
          entries: {
            'queue-999': { entryId: 'entry-999', token: 'token-999' },
          },
        },
        version: 0,
      })
    );

    useCustomerStore.persist.rehydrate();

    const entry = useCustomerStore.getState().getEntry('queue-999');
    expect(entry).toEqual({ entryId: 'entry-999', token: 'token-999' });
  });
});
