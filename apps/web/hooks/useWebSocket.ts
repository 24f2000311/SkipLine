import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCustomerStore } from '@/features/customer/stores/useCustomerStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8123/api/v1";
const WS_BASE_URL = API_BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '/ws');

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export const useWebSocket = (queueId?: string) => {
  const queryClient = useQueryClient();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isComponentMounted = useRef(true);

  // Authentication states
  const organizerToken = useAuthStore((state) => state.accessToken);
  const customerEntry = useCustomerStore((state) => queueId ? state.entries[queueId] : null);

  const connect = useCallback(() => {
    if (!isComponentMounted.current) return;
    if (!queueId) return; // Only connect if there's a queueId
    
    const url = new URL(WS_BASE_URL);
    if (organizerToken) {
      url.searchParams.set('token', organizerToken);
    }

    setConnectionState('connecting');

    try {
      const ws = new WebSocket(url.toString());
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState('connected');
        retryCountRef.current = 0;

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
        ws.send(JSON.stringify(subscribeMsg));
      };

      ws.onmessage = (event) => {
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
        setConnectionState('disconnected');
        wsRef.current = null;
        
        if (isComponentMounted.current) {
          const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
          retryCountRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay);
        }
      };

      ws.onerror = () => {
        // Handled by onclose
      };

    } catch (e) {
      setConnectionState('disconnected');
    }
  }, [queueId, organizerToken, customerEntry?.token, customerEntry?.entryId, queryClient]);

  useEffect(() => {
    isComponentMounted.current = true;
    connect();

    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN && queueId) {
           wsRef.current.send(JSON.stringify({ action: 'UNSUBSCRIBE', queueId }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect, queueId]);

  return { connectionState };
};
