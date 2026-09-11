import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import prisma from '../../src/infrastructure/database/prisma.js';
import crypto from 'crypto';

describe('Test Group 1: Event Lifecycle', () => {
  it('Organizer can create an event and default status is DRAFT', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { name: 'My Test Event' });
    
    expect(event).toBeDefined();
    expect(event.name).toBe('My Test Event');
    expect(event.status).toBe('DRAFT');
  });

  it('Event can transition through valid lifecycle states', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);

    let res = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'LIVE' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('LIVE');
  });

  it('Only the authenticated organizer can modify their event', async () => {
    const org1 = await createOrganizer('org1@test.com');
    const org2 = await createOrganizer('org2@test.com');
    const event = await createEvent(org1.token);

    const res = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org2.token}`)
      .send({ status: 'LIVE' });
    
    expect(res.status).toBe(404);
  });

  it('Event cancellation bulk updates WAITING and CALLED entries, but leaves SERVING', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
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

    const res = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'CANCELLED' });

    expect(res.status).toBe(200);

    const waitingAfter = await prisma.queueEntry.findUnique({ where: { id: entryWaiting.id } });
    const calledAfter = await prisma.queueEntry.findUnique({ where: { id: entryCalled.id } });
    const servingAfter = await prisma.queueEntry.findUnique({ where: { id: entryServing.id } });

    expect(waitingAfter.status).toBe('CANCELLED');
    expect(calledAfter.status).toBe('CANCELLED');
    expect(servingAfter.status).toBe('SERVING');
  });

  it('DRAFT event with NO entries can be hard deleted', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'DRAFT' });
    await createQueue(org.token, event.id); // Add an empty queue

    const res = await request(app)
      .delete(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(200);

    const deletedEvent = await prisma.event.findUnique({ where: { id: event.id } });
    expect(deletedEvent).toBeNull();
  });

  it('LIVE event cannot be hard deleted', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });

    const res = await request(app)
      .delete(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Only DRAFT or SCHEDULED events can be deleted/);
  });

  it('DRAFT event with participant history cannot be hard deleted', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'DRAFT' });
    const queue = await createQueue(org.token, event.id);

    await prisma.queueEntry.create({
      data: { queueId: queue.id, status: 'WAITING', sequenceNumber: 1, token: crypto.randomUUID(), accessTokenHash: crypto.randomUUID(), sessionId: crypto.randomUUID() }
    });

    const res = await request(app)
      .delete(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/Cannot delete an event that has participant history/);
  });
});

describe('Test Group 2: Public Event/Queue Lifecycle', () => {
  it('DRAFT event rejects public queue fetch', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'DRAFT' });
    const queue = await createQueue(org.token, event.id);

    const res = await request(app).get(`/api/v1/queues/${queue.id}/public`);
    expect(res.status).toBe(403);
  });

  it('LIVE event allows public queue fetch when queue is OPEN', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const res = await request(app).get(`/api/v1/queues/${queue.id}/public`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(queue.id);
  });

  it('LIVE event + PAUSED queue allows public fetch but blocks join', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'PAUSED' });

    const fetchRes = await request(app).get(`/api/v1/queues/${queue.id}/public`);
    expect(fetchRes.status).toBe(200);

    const joinRes = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 's1' });
    expect(joinRes.status).toBe(400);
  });

  it('LIVE event whose endAt has passed blocks public access', async () => {
    const org = await createOrganizer();
    const startAt = new Date(Date.now() - 20000);
    const endAt = new Date(Date.now() - 10000);
    
    const event = await createEvent(org.token, { 
      status: 'LIVE', 
      startAt: startAt.toISOString(), 
      endAt: endAt.toISOString() 
    });
    const queue = await createQueue(org.token, event.id);

    const fetchRes = await request(app).get(`/api/v1/queues/${queue.id}/public`);
    expect(fetchRes.status).toBe(403);

    const joinRes = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 's1' });
    expect(joinRes.status).toBe(403);
  });
});
