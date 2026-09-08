import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';

describe('Test Group 4: Customer Join', () => {
  it('Customer can join an OPEN queue of a LIVE event', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const res = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-join-1', customerName: 'Test Customer' });
    
    expect(res.status).toBe(201);
    expect(res.body.data.entry).toBeDefined();
    expect(res.body.data.entry.status).toBe('WAITING');
    expect(res.body.data.entry.sequenceNumber).toBeDefined();
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('Customer can retrieve their queue status using their token', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const joinRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-status-1' });
    
    const { entry, accessToken } = joinRes.body.data;

    const statusRes = await request(app)
      .get(`/api/v1/queue-entries/${entry.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
    
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.entry.status).toBe('WAITING');
  });

  it('Customer can cancel their WAITING entry', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const joinRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-cancel-1' });
    
    const { entry, accessToken } = joinRes.body.data;

    const cancelRes = await request(app)
      .post(`/api/v1/queue-entries/${entry.id}/leave`)
      .set('Authorization', `Bearer ${accessToken}`);
    
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
  });

  it('Rejoining creates a NEW QueueEntry instead of resurrecting', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const join1 = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'session-rejoin-1' });
    await request(app).post(`/api/v1/queue-entries/${join1.body.data.entry.id}/leave`).set('Authorization', `Bearer ${join1.body.data.accessToken}`);

    const join2 = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'session-rejoin-1' });
    expect(join2.status).toBe(201);
    expect(join2.body.data.entry.id).not.toBe(join1.body.data.entry.id);
  });

  it('Joining a PAUSED queue is rejected', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);
    await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'PAUSED' });

    const res = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 's1' });
    expect(res.status).toBe(400);
  });

  it('Joining a CLOSED queue is rejected', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);
    await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'CLOSED' });

    const res = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 's1' });
    expect(res.status).toBe(400);
  });

  it('Joining a non-LIVE event is rejected', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'DRAFT' });
    const queue = await createQueue(org.token, event.id);

    const res = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 's1' });
    expect(res.status).toBe(403);
  });
});
