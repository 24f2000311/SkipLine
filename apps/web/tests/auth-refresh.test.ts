import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { apiClient } from '../lib/api/client';
import { useAuthStore } from '../stores/useAuthStore';


describe('Auth Refresh Interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: '1', name: 'Test', email: 'test@example.com' } as any,
      accessToken: 'old-access-token',
      refreshToken: 'valid-refresh-token',
    });
  });

  it('calls refresh endpoint on 401 and retries original request', async () => {
    // Setup mock for the refresh endpoint
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: {
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      },
    });

    // Mock an adapter for apiClient to simulate a 401 then a 200
    const mockAdapter = vi.fn()
      .mockRejectedValueOnce({
        response: { status: 401 },
        config: {
          headers: { Authorization: 'Bearer old-access-token' },
          url: '/protected-route',
        },
      })
      .mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        config: {},
        headers: {},
        statusText: 'OK',
      });
    
    // Temporarily replace apiClient adapter
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = mockAdapter;

    const response = await apiClient.get('/protected-route');

    expect(response).toEqual({ success: true });
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {
      refreshToken: 'valid-refresh-token',
    });

    const store = useAuthStore.getState();
    expect(store.accessToken).toBe('new-access-token');
    expect(store.refreshToken).toBe('new-refresh-token');

    // Restore adapter
    apiClient.defaults.adapter = originalAdapter;
  });

  it('clears auth state if refresh fails', async () => {
    vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Refresh failed'));

    const mockAdapter = vi.fn().mockRejectedValueOnce({
      response: { status: 401 },
      config: {
        headers: { Authorization: 'Bearer old-access-token' },
        url: '/protected-route',
      },
    });
    
    const originalAdapter = apiClient.defaults.adapter;
    apiClient.defaults.adapter = mockAdapter;

    await expect(apiClient.get('/protected-route')).rejects.toThrow();

    const store = useAuthStore.getState();
    expect(store.accessToken).toBeNull();
    expect(store.refreshToken).toBeNull();
    expect(store.user).toBeNull();

    apiClient.defaults.adapter = originalAdapter;
  });
});
