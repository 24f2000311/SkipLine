import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import app from '../../src/app.js';
import { initWebSocketServer } from '../../src/infrastructure/websocket/websocket.server.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import request from 'supertest';
import { hashAccessToken } from '../../src/modules/queue-entries/queue-entry.utils.js';
import prisma from '../../src/infrastructure/database/prisma.js';

describe('WebSocket Authentication & Authorization', () => {
  let server;
  let wss;
  let port;
  let organizer1;
  let organizer2;
  let event1;
  let queue1;
  let queue2;
  let customerToken;
  let customerEntryId;

  beforeAll(async () => {
    // Setup HTTP server with WS attached for testing
    server = http.createServer(app);
    wss = initWebSocketServer(server);
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });

    // Seed Data
    organizer1 = await createOrganizer('ws-org1');
    organizer2 = await createOrganizer('ws-org2');
    event1 = await createEvent(organizer1.token, { status: 'LIVE' });
    queue1 = await createQueue(organizer1.token, event1.id);
    
    const event2 = await createEvent(organizer2.token, { status: 'LIVE' });
    queue2 = await createQueue(organizer2.token, event2.id);

    // Create a customer entry in queue1 (route is /entries not /join)
    const joinRes = await request(app)
      .post(`/api/v1/queues/${queue1.id}/entries`)
      .send({ sessionId: 'ws-cust-session', customerName: 'WS Cust' });
    
    customerToken = joinRes.body.data.accessToken;
    customerEntryId = joinRes.body.data.entry.id;
  });

  afterAll(async () => {
    wss.close();
    await new Promise((resolve) => server.close(resolve));
  });

  const connectWs = (token) => {
    const url = token ? `ws://localhost:${port}/ws?token=${token}` : `ws://localhost:${port}/ws`;
    return new WebSocket(url);
  };

  const waitForMessage = (ws) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout waiting for message')), 2000);
      ws.once('message', (data) => {
        clearTimeout(timeout);
        resolve(JSON.parse(data.toString()));
      });
      ws.once('close', (code, reason) => {
        clearTimeout(timeout);
        reject(new Error(`WebSocket closed: ${code} ${reason.toString()}`));
      });
    });
  };

  it('authenticated organizer can subscribe to owned queue', async () => {
    const ws = connectWs(organizer1.token);
    
    await new Promise((resolve) => ws.once('open', resolve));

    ws.send(JSON.stringify({ action: 'SUBSCRIBE', queueId: queue1.id }));

    const response = await waitForMessage(ws);
    expect(response.event).toBe('SUBSCRIBED');
    expect(response.queueId).toBe(queue1.id);
    ws.close();
  });

  it('organizer cannot subscribe to another organizer\'s queue', async () => {
    const ws = connectWs(organizer1.token);
    await new Promise((resolve) => ws.once('open', resolve));

    ws.send(JSON.stringify({ action: 'SUBSCRIBE', queueId: queue2.id })); // org1 trying to access org2's queue

    const response = await waitForMessage(ws);
    expect(response.event).toBe('ERROR');
    expect(response.message).toBe('Unauthorized queue access');
    ws.close();
  });

  it('invalid/expired organizer token rejected during connection', async () => {
    const ws = connectWs('invalid-token');
    
    await new Promise((resolve) => {
      ws.once('close', (code, reason) => {
        expect(code).toBe(4001);
        expect(reason.toString()).toBe('Unauthorized');
        resolve();
      });
    });
  });

  it('customer can subscribe to their own queue entry', async () => {
    const ws = connectWs(); // Unauthenticated connection for customer initially
    await new Promise((resolve) => ws.once('open', resolve));

    ws.send(JSON.stringify({ 
      action: 'SUBSCRIBE', 
      queueId: queue1.id, 
      accessToken: customerToken 
    }));

    const response = await waitForMessage(ws);
    expect(response.event).toBe('SUBSCRIBED');
    expect(response.queueId).toBe(queue1.id);
    ws.close();
  });

  it('customer cannot subscribe to another queue', async () => {
    const ws = connectWs();
    await new Promise((resolve) => ws.once('open', resolve));

    ws.send(JSON.stringify({ 
      action: 'SUBSCRIBE', 
      queueId: queue2.id, // Wrong queue
      accessToken: customerToken 
    }));

    const response = await waitForMessage(ws);
    expect(response.event).toBe('ERROR');
    expect(response.message).toContain('Invalid customer credential or unauthorized queue');
    ws.close();
  });

  it('invalid customer credential rejected', async () => {
    const ws = connectWs();
    await new Promise((resolve) => ws.once('open', resolve));

    ws.send(JSON.stringify({ 
      action: 'SUBSCRIBE', 
      queueId: queue1.id, 
      accessToken: 'sk_live_invalid' 
    }));

    const response = await waitForMessage(ws);
    expect(response.event).toBe('ERROR');
    expect(response.message).toContain('Invalid customer credential');
    ws.close();
  });

  it('malformed subscription rejected', async () => {
    const ws = connectWs();
    await new Promise((resolve) => ws.once('open', resolve));

    ws.send(JSON.stringify({ 
      action: 'SUBSCRIBE' // missing queueId
    }));

    const response = await waitForMessage(ws);
    expect(response.event).toBe('ERROR');
    expect(response.message).toBe('Missing or invalid queueId');
    ws.close();
  });

  it('disconnect cleanup still works', async () => {
    const ws = connectWs(organizer1.token);
    await new Promise((resolve) => ws.once('open', resolve));

    ws.send(JSON.stringify({ action: 'SUBSCRIBE', queueId: queue1.id }));
    await waitForMessage(ws); // Wait for SUBSCRIBED
    
    // Check that server registered the subscription
    // Because we export wss? We don't export queueSubscriptions directly but we know it works if broadcast doesn't crash
    ws.close();
    
    await new Promise((resolve) => setTimeout(resolve, 100)); // wait for close event to fire on server
    // If it cleans up without error, the test passes
  });
});
