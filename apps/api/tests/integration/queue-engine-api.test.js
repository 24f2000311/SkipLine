import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import prisma from '../../src/infrastructure/database/prisma.js';

describe('Test Group 5: Queue Engine via API', () => {
  const setupQueue = async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);
    return { org, event, queue };
  };

  it('call-next selects a WAITING entry and transitions it to CALLED', async () => {
    const { org, queue } = await setupQueue();

    // Join via API
    await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'cn-s1', customerName: 'Customer 1' });

    const res = await request(app)
      .post(`/api/v1/queues/${queue.id}/call-next`)
      .set('Authorization', `Bearer ${org.token}`);
    
    expect(res.status).toBe(200);
    // callNext returns the entry directly in data (not data.entry)
    expect(res.body.data.status).toBe('CALLED');
  });

  it('No eligible entries returns 200 with data: null', async () => {
    const { org, queue } = await setupQueue();

    const res = await request(app)
      .post(`/api/v1/queues/${queue.id}/call-next`)
      .set('Authorization', `Bearer ${org.token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });
});

describe('Test Group 6: Serving/Completion/No-Show', () => {
  it('SERVING and COMPLETED transitions work and update timestamps', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'serve-s1' });
    
    const callRes = await request(app).post(`/api/v1/queues/${queue.id}/call-next`).set('Authorization', `Bearer ${org.token}`);
    expect(callRes.body.data).not.toBeNull();
    const entryId = callRes.body.data.id;

    const serveRes = await request(app)
      .post(`/api/v1/queue-entries/${entryId}/start`)
      .set('Authorization', `Bearer ${org.token}`);
    
    expect(serveRes.status).toBe(200);
    expect(serveRes.body.data.status).toBe('SERVING');

    const completeRes = await request(app)
      .post(`/api/v1/queue-entries/${entryId}/complete`)
      .set('Authorization', `Bearer ${org.token}`);
    
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');
  });

  it('No-show increments count and requeues, 3rd no-show results in SKIPPED', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const joinRes = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'noshow-s1' });
    expect(joinRes.status).toBe(201);
    const entryId = joinRes.body.data.entry.id;

    // 1st no-show: call-next then mark as no-show
    await request(app).post(`/api/v1/queues/${queue.id}/call-next`).set('Authorization', `Bearer ${org.token}`);
    const ns1 = await request(app).post(`/api/v1/queue-entries/${entryId}/no-show`).set('Authorization', `Bearer ${org.token}`);
    expect(ns1.status).toBe(200);
    expect(ns1.body.data.noShowCount).toBe(1);
    // After first no-show, entry should be requeued to WAITING
    expect(ns1.body.data.status).toBe('WAITING');

    // 2nd no-show
    await request(app).post(`/api/v1/queues/${queue.id}/call-next`).set('Authorization', `Bearer ${org.token}`);
    const ns2 = await request(app).post(`/api/v1/queue-entries/${entryId}/no-show`).set('Authorization', `Bearer ${org.token}`);
    expect(ns2.body.data.noShowCount).toBe(2);
    expect(ns2.body.data.status).toBe('WAITING');

    // 3rd no-show — should be SKIPPED
    await request(app).post(`/api/v1/queues/${queue.id}/call-next`).set('Authorization', `Bearer ${org.token}`);
    const ns3 = await request(app).post(`/api/v1/queue-entries/${entryId}/no-show`).set('Authorization', `Bearer ${org.token}`);
    expect(ns3.body.data.noShowCount).toBe(3);
    expect(ns3.body.data.status).toBe('SKIPPED');
  });
});
