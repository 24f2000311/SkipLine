import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { WebSocket } from 'ws';
import app from '../../src/app.js';
import { initWebSocketServer } from '../../src/infrastructure/websocket/websocket.server.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import request from 'supertest';
import prisma from '../../src/infrastructure/database/prisma.js';

describe('WebSocket Unified Events', () => {
  let server;
  let wss;
  let port;
  let organizer;
  let event;
  let queue;
  let ws;

  beforeAll(async () => {
    server = http.createServer(app);
    wss = initWebSocketServer(server);
    await new Promise((resolve) => {
      server.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });

    organizer = await createOrganizer('ws-events-org');
  });

  afterAll(async () => {
    wss.close();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach(async () => {
    // Create fresh event and queue for each test to avoid interference
    event = await createEvent(organizer.token, { status: 'LIVE' });
    queue = await createQueue(organizer.token, event.id);

    // Connect organizer WS
    ws = new WebSocket(`ws://localhost:${port}/ws?token=${organizer.token}`);
    await new Promise((resolve) => ws.once('open', resolve));

    ws.send(JSON.stringify({ action: 'SUBSCRIBE', queueId: queue.id }));
    
    // Wait for SUBSCRIBED event
    await new Promise((resolve) => {
      const listener = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.event === 'SUBSCRIBED') {
          ws.off('message', listener);
          resolve();
        }
      };
      ws.on('message', listener);
    });
  });

  afterEach(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  const waitForNextMessage = (wsObj) => {
    return new Promise((resolve, reject) => {
      const listener = (data) => {
        clearTimeout(timeout);
        wsObj.removeListener('message', listener);
        resolve(JSON.parse(data.toString()));
      };
      const timeout = setTimeout(() => {
        wsObj.removeListener('message', listener);
        reject(new Error('Timeout waiting for message'));
      }, 3000);
      wsObj.on('message', listener);
    });
  };

  const drainMessages = async (wsObj) => {
    let drained = false;
    while (!drained) {
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(reject, 50);
          wsObj.once('message', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      } catch (e) {
        drained = true;
      }
    }
  };

  it('join emits QUEUE_ENTRY_UPDATED', async () => {
    const msgPromise = waitForNextMessage(ws);
    
    await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-join' });

    const msg = await msgPromise;
    expect(msg.event).toBe('QUEUE_ENTRY_UPDATED');
    expect(msg.data.status).toBe('WAITING');
    expect(msg.data.entryId).toBeDefined();
  });

  it('leave emits QUEUE_ENTRY_UPDATED', async () => {
    const p = waitForNextMessage(ws);
    const joinRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-leave' });
    await p;

    const { entry, accessToken } = joinRes.body.data;
    
    const msgPromise = waitForNextMessage(ws);
    await request(app)
      .post(`/api/v1/queue-entries/${entry.id}/leave`)
      .set('Authorization', `Bearer ${accessToken}`);

    const msg = await msgPromise;
    expect(msg.event).toBe('QUEUE_ENTRY_UPDATED');
    expect(msg.data.status).toBe('CANCELLED');
    expect(msg.data.entryId).toBe(entry.id);
  });

  it('callNext emits QUEUE_ENTRY_UPDATED(CALLED)', async () => {
    const p = waitForNextMessage(ws);
    const joinRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-callnext' });
    await p;

    const msgPromise = waitForNextMessage(ws);
    await request(app)
      .post(`/api/v1/queues/${queue.id}/call-next`)
      .set('Authorization', `Bearer ${organizer.token}`);

    const msg = await msgPromise;
    expect(msg.event).toBe('QUEUE_ENTRY_UPDATED');
    expect(msg.data.status).toBe('CALLED');
    expect(msg.data.entryId).toBe(joinRes.body.data.entry.id);
  });

  it('startServing emits QUEUE_ENTRY_UPDATED(SERVING)', async () => {
    const p1 = waitForNextMessage(ws);
    const joinRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-serve' });
    await p1;
    
    const p2 = waitForNextMessage(ws);
    await request(app)
      .post(`/api/v1/queues/${queue.id}/call-next`)
      .set('Authorization', `Bearer ${organizer.token}`);
    await p2;

    const msgPromise = waitForNextMessage(ws);
    await request(app)
      .post(`/api/v1/queue-entries/${joinRes.body.data.entry.id}/start`)
      .set('Authorization', `Bearer ${organizer.token}`);

    const msg = await msgPromise;
    expect(msg.event).toBe('QUEUE_ENTRY_UPDATED');
    expect(msg.data.status).toBe('SERVING');
  });

  it('complete emits QUEUE_ENTRY_UPDATED(COMPLETED)', async () => {
    const p1 = waitForNextMessage(ws);
    const joinRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-comp' });
    await p1;
    
    const p2 = waitForNextMessage(ws);
    await request(app)
      .post(`/api/v1/queues/${queue.id}/call-next`)
      .set('Authorization', `Bearer ${organizer.token}`);
    await p2;

    const p3 = waitForNextMessage(ws);
    await request(app)
      .post(`/api/v1/queue-entries/${joinRes.body.data.entry.id}/start`)
      .set('Authorization', `Bearer ${organizer.token}`);
    await p3;

    const msgPromise = waitForNextMessage(ws);
    await request(app)
      .post(`/api/v1/queue-entries/${joinRes.body.data.entry.id}/complete`)
      .set('Authorization', `Bearer ${organizer.token}`);

    const msg = await msgPromise;
    expect(msg.event).toBe('QUEUE_ENTRY_UPDATED');
    expect(msg.data.status).toBe('COMPLETED');
  });

  it('no-show requeue emits WAITING', async () => {
    const p1 = waitForNextMessage(ws);
    const joinRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-noshow' });
    await p1;
    
    const p2 = waitForNextMessage(ws);
    await request(app)
      .post(`/api/v1/queues/${queue.id}/call-next`)
      .set('Authorization', `Bearer ${organizer.token}`);
    await p2;

    const msgPromise = waitForNextMessage(ws);
    await request(app)
      .post(`/api/v1/queue-entries/${joinRes.body.data.entry.id}/no-show`)
      .set('Authorization', `Bearer ${organizer.token}`);

    const msg = await msgPromise;
    expect(msg.event).toBe('QUEUE_ENTRY_UPDATED');
    expect(msg.data.status).toBe('WAITING');
  });

  it('max no-show emits SKIPPED', async () => {
    const p1 = waitForNextMessage(ws);
    const joinRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-noshow-max' });
    await p1;

    const entryId = joinRes.body.data.entry.id;
    
    for (let i = 0; i < 2; i++) {
      const pNext = waitForNextMessage(ws);
      await request(app).post(`/api/v1/queues/${queue.id}/call-next`).set('Authorization', `Bearer ${organizer.token}`);
      await pNext;

      const pNoShow = waitForNextMessage(ws);
      await request(app).post(`/api/v1/queue-entries/${entryId}/no-show`).set('Authorization', `Bearer ${organizer.token}`);
      await pNoShow;
    }

    const pNext3 = waitForNextMessage(ws);
    await request(app).post(`/api/v1/queues/${queue.id}/call-next`).set('Authorization', `Bearer ${organizer.token}`);
    await pNext3;

    const msgPromise = waitForNextMessage(ws);
    await request(app).post(`/api/v1/queue-entries/${entryId}/no-show`).set('Authorization', `Bearer ${organizer.token}`);
    
    const msg = await msgPromise;
    expect(msg.event).toBe('QUEUE_ENTRY_UPDATED');
    expect(msg.data.status).toBe('SKIPPED');
  });

  it('queue status change emits QUEUE_UPDATED', async () => {
    const msgPromise = waitForNextMessage(ws);
    
    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ status: 'PAUSED' });

    const msg = await msgPromise;
    expect(msg.event).toBe('QUEUE_UPDATED');
    expect(msg.data.queueId).toBe(queue.id);
  });

  it('queue closure emits events only for affected WAITING entries', async () => {
    await drainMessages(ws);

    const p1 = waitForNextMessage(ws);
    await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'q-close-1' });
    await p1;
    
    const p2 = waitForNextMessage(ws);
    const join2 = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'q-close-2' });
    await p2;

    const p3 = waitForNextMessage(ws);
    await request(app).post(`/api/v1/queues/${queue.id}/call-next`).set('Authorization', `Bearer ${organizer.token}`);
    await p3;

    const messages = [];
    const listener = (data) => messages.push(JSON.parse(data.toString()));
    ws.on('message', listener);

    await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${organizer.token}`).send({ status: 'CLOSED' });
    await new Promise(r => setTimeout(r, 200));
    ws.removeListener('message', listener);

    const queueUpdated = messages.find(m => m.event === 'QUEUE_UPDATED');
    const entryUpdated = messages.filter(m => m.event === 'QUEUE_ENTRY_UPDATED');

    expect(queueUpdated).toBeDefined();
    expect(entryUpdated.length).toBe(1);
    expect(entryUpdated[0].data.status).toBe('CANCELLED');
    expect(entryUpdated[0].data.entryId).toBe(join2.body.data.entry.id);
  });

  it('event cancellation emits events only for affected entries', async () => {
    await drainMessages(ws);

    const p1 = waitForNextMessage(ws);
    await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'e-close-1' });
    await p1;
    
    const p2 = waitForNextMessage(ws);
    const join2 = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'e-close-2' });
    await p2;

    const p3 = waitForNextMessage(ws);
    await request(app).post(`/api/v1/queues/${queue.id}/call-next`).set('Authorization', `Bearer ${organizer.token}`);
    await p3;

    const firstEntry = await prisma.queueEntry.findFirst({ where: { queueId: queue.id, status: 'CALLED' }});
    const p4 = waitForNextMessage(ws);
    await request(app).post(`/api/v1/queue-entries/${firstEntry.id}/start`).set('Authorization', `Bearer ${organizer.token}`);
    await p4;

    const messages = [];
    const listener = (data) => messages.push(JSON.parse(data.toString()));
    ws.on('message', listener);

    await request(app).put(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${organizer.token}`).send({ status: 'CANCELLED' });
    await new Promise(r => setTimeout(r, 200));
    ws.removeListener('message', listener);

    const queueUpdated = messages.find(m => m.event === 'QUEUE_UPDATED');
    const entryUpdated = messages.filter(m => m.event === 'QUEUE_ENTRY_UPDATED');

    expect(queueUpdated).toBeDefined();
    // 1 waiting + 0 called (first is SERVING). 
    // Wait, event cancellation cancels WAITING and CALLED.
    // In our DB, we have 1 SERVING, 1 WAITING. 
    // Wait! Let me check what we have. join1 was CALLED, then SERVING. join2 is WAITING.
    // So 1 WAITING.
    expect(entryUpdated.length).toBe(1);
    expect(entryUpdated[0].data.status).toBe('CANCELLED');
  });

  it('failed transaction does not emit a realtime event', async () => {
    // Empty the queue first if needed, or just let it be.
    // Close the queue so that joins will fail
    await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${organizer.token}`).send({ status: 'CLOSED' });
    
    // consume queue closed messages
    const messages = [];
    ws.on('message', (data) => messages.push(JSON.parse(data.toString())));
    await new Promise(r => setTimeout(r, 200));
    messages.length = 0; // clear

    // Try to join closed queue
    const res = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'fail-tx' });
    expect(res.status).toBe(400); // Should fail with QUEUE_CLOSED or similar

    await new Promise(r => setTimeout(r, 200));
    ws.removeAllListeners('message');

    expect(messages.length).toBe(0);
  });
});
