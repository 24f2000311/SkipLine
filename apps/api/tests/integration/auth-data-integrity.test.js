import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import prisma from '../../src/infrastructure/database/prisma.js';

describe('Test Group 7: Authentication & Authorization', () => {
  it('Protected endpoint without access token is rejected', async () => {
    const res = await request(app).post('/api/v1/events').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('Invalid token is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', 'Bearer invalid.token.string')
      .send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('Valid organizer token is allowed', async () => {
    const org = await createOrganizer();
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${org.token}`)
      .send({ name: 'Test', startAt: startAt.toISOString(), endAt: endAt.toISOString() });
    expect(res.status).toBe(201);
  });

  it('Organizer A cannot access Organizer B event', async () => {
    const org1 = await createOrganizer('org1@test.com');
    const org2 = await createOrganizer('org2@test.com');
    const event = await createEvent(org1.token);

    const res = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org2.token}`)
      .send({ status: 'LIVE' });
    
    expect(res.status).toBe(404);
  });

  it('Customer public endpoints do not require authentication', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const res = await request(app).get(`/api/v1/queues/${queue.id}/public`);
    expect(res.status).toBe(200);
  });

  it('Customer access token does not grant organizer privileges', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const joinRes = await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'auth-s1' });
    const customerToken = joinRes.body.data.accessToken;

    const res = await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'PAUSED' });
    
    // Customer token should fail organizer auth
    expect([401, 404]).toContain(res.status);
  });
});

describe('Test Group 8: Data Integrity', () => {
  it('Foreign-key relationships remain valid', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'integrity-s1' });

    const dbUser = await prisma.user.findUnique({ where: { id: org.id }, include: { events: { include: { queues: { include: { entries: true } } } } } });

    expect(dbUser).toBeDefined();
    expect(dbUser.events.length).toBeGreaterThanOrEqual(1);
    const dbEvent = dbUser.events.find(e => e.id === event.id);
    expect(dbEvent).toBeDefined();
    expect(dbEvent.queues[0].id).toBe(queue.id);
    expect(dbEvent.queues[0].entries.length).toBeGreaterThanOrEqual(1);
    expect(dbEvent.queues[0].entries[0].status).toBe('WAITING');
  });

  it('Historical QueueEntries are retained during lifecycle operations', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    await request(app).post(`/api/v1/queues/${queue.id}/entries`).send({ sessionId: 'hist-s1' });
    
    // Close the queue
    await request(app).put(`/api/v1/queues/${queue.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'CLOSED' });
    
    // Cancel the event
    await request(app).put(`/api/v1/events/${event.id}`).set('Authorization', `Bearer ${org.token}`).send({ status: 'CANCELLED' });

    const entries = await prisma.queueEntry.findMany({ where: { queueId: queue.id } });
    expect(entries.length).toBe(1);
    expect(entries[0].status).toBe('CANCELLED');
  });
});
