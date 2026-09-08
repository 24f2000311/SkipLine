import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import prisma from '../../src/infrastructure/database/prisma.js';
import crypto from 'crypto';

describe('Test Group 3: Queue Lifecycle', () => {
  it('Organizer can create a queue and defaults are persisted', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    
    const res = await request(app)
      .post('/api/v1/queues')
      .set('Authorization', `Bearer ${org.token}`)
      .send({ eventId: event.id, name: 'Test Queue' });
    
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('OPEN');
  });

  it('OPEN -> PAUSED -> OPEN works', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    const res1 = await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'PAUSED' });
    expect(res1.status).toBe(200);
    expect(res1.body.data.status).toBe('PAUSED');

    const res2 = await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'OPEN' });
    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe('OPEN');
  });

  it('OPEN -> CLOSED works', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    const res = await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'CLOSED' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CLOSED');
  });

  it('CLOSED is terminal, cannot transition back', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'CLOSED' });

    const resOpen = await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'OPEN' });
    expect(resOpen.status).toBe(400);

    const resPaused = await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'PAUSED' });
    expect(resPaused.status).toBe(400);
  });

  it('Unauthorized organizer cannot modify queue', async () => {
    const org1 = await createOrganizer('org1@test.com');
    const org2 = await createOrganizer('org2@test.com');
    const event = await createEvent(org1.token);
    const queue = await createQueue(org1.token, event.id);

    const res = await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org2.token}`).send({ status: 'PAUSED' });
    expect(res.status).toBe(404);
  });

  it('Closing a queue cancels WAITING entries but leaves CALLED and SERVING', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    const entryWaiting = await prisma.queueEntry.create({
      data: { queueId: queue.id, status: 'WAITING', sequenceNumber: 1, token: crypto.randomUUID(), accessTokenHash: crypto.randomUUID(), sessionId: crypto.randomUUID() }
    });
    const entryCalled = await prisma.queueEntry.create({
      data: { queueId: queue.id, status: 'CALLED', sequenceNumber: 2, token: crypto.randomUUID(), accessTokenHash: crypto.randomUUID(), sessionId: crypto.randomUUID() }
    });
    const entryServing = await prisma.queueEntry.create({
      data: { queueId: queue.id, status: 'SERVING', sequenceNumber: 3, token: crypto.randomUUID(), accessTokenHash: crypto.randomUUID(), sessionId: crypto.randomUUID() }
    });

    await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'CLOSED' });

    const waitingAfter = await prisma.queueEntry.findUnique({ where: { id: entryWaiting.id } });
    const calledAfter = await prisma.queueEntry.findUnique({ where: { id: entryCalled.id } });
    const servingAfter = await prisma.queueEntry.findUnique({ where: { id: entryServing.id } });

    expect(waitingAfter.status).toBe('CANCELLED');
    expect(calledAfter.status).toBe('CALLED');
    expect(servingAfter.status).toBe('SERVING');
  });
});
