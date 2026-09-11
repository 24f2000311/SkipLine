import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCustomerStore } from '@/features/customer/stores/useCustomerStore';
import { getApiUrl } from '@/lib/url';

const getWsBaseUrl = () => {
  const apiUrl = getApiUrl();
  return apiUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '/ws');
};

const WS_BASE_URL = getWsBaseUrl();

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export const useWebSocket = (queueId?: string, enabled: boolean = true) => {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  // Authentication states
  const organizerToken = useAuthStore((state) => state.accessToken);
  const customerEntry = useCustomerStore((state) => queueId ? state.entries[queueId] : null);

  useEffect(() => {
    if (!queueId || !enabled) {
      setConnectionState('disconnected');
      return;
    }

    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let retryCount = 0;

    const connect = () => {
      if (!active) return;

      const url = new URL(WS_BASE_URL);
      if (organizerToken) {
        url.searchParams.set('token', organizerToken);
      }

      setConnectionState('connecting');

      try {
        ws = new WebSocket(url.toString());

        ws.onopen = () => {
          if (!active) return;
          setConnectionState('connected');
          retryCount = 0;

          // Trigger authoritative re-sync on reconnect
          queryClient.invalidateQueries({ queryKey: ["queue", queueId] });
          queryClient.invalidateQueries({ queryKey: ["queue-entries", queueId] });
          if (customerEntry?.entryId) {
            queryClient.invalidateQueries({ queryKey: ["customer-status", customerEntry.entryId] });
          }

          // Send SUBSCRIBE
          const subscribeMsg: any = { action: 'SUBSCRIBE', queueId };
          if (!organizerToken && customerEntry?.token) {
            subscribeMsg.accessToken = customerEntry.token;
          }
          ws?.send(JSON.stringify(subscribeMsg));
        };

        ws.onmessage = (event) => {
          if (!active) return;
          try {
            const msg = JSON.parse(event.data);
            
            if (msg.event === 'QUEUE_UPDATED') {
               queryClient.invalidateQueries({ queryKey: ["queue", msg.queueId] });
               queryClient.invalidateQueries({ queryKey: ["public-queue", msg.queueId] });
            } else if (msg.event === 'QUEUE_ENTRY_UPDATED') {
               queryClient.invalidateQueries({ queryKey: ["queue-entries", msg.queueId] });
               queryClient.invalidateQueries({ queryKey: ["queue", msg.queueId] });
               queryClient.invalidateQueries({ queryKey: ["public-queue", msg.queueId] });
               if (msg.data?.entryId) {
                 queryClient.invalidateQueries({ queryKey: ["customer-status", msg.data.entryId] });
               }
            }
          } catch (e) {
            // ignore malformed
          }
        };

        ws.onclose = () => {
          if (!active) return;
          setConnectionState('disconnected');
          ws = null;
          
          const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
          retryCount += 1;
          reconnectTimeout = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          // Handled by onclose
        };

      } catch (e) {
        if (active) setConnectionState('disconnected');
      }
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        if (ws.readyState === WebSocket.OPEN && queueId) {
           ws.send(JSON.stringify({ action: 'UNSUBSCRIBE', queueId }));
        }
        ws.close();
        ws = null;
      }
    };
  }, [queueId, enabled, organizerToken, customerEntry?.token, customerEntry?.entryId, queryClient]);

  return { connectionState };
};
