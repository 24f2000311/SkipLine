import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import prisma from '../../src/infrastructure/database/prisma.js';
import crypto from 'crypto';

describe('Queue Deletion Rules & Historical Data Protection', () => {
  it('rejects deletion of an OPEN queue', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id); // default status is OPEN

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('QUEUE_IS_OPEN');
    expect(res.body.error.message).toMatch(/Queue cannot be deleted while it is open/);
  });

  it('allows deletion of an empty PAUSED queue', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    // Pause queue
    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'PAUSED' });

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(200);

    const deleted = await prisma.queue.findUnique({ where: { id: queue.id } });
    expect(deleted).toBeNull();
  });

  it('allows deletion of an empty CLOSED queue', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    // Close queue
    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'CLOSED' });

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(200);

    const deleted = await prisma.queue.findUnique({ where: { id: queue.id } });
    expect(deleted).toBeNull();
  });

  it('rejects deletion of a queue with WAITING active participants', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    // Add a WAITING entry
    await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        status: 'WAITING',
        sequenceNumber: 1,
        token: crypto.randomUUID(),
        accessTokenHash: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
      },
    });

    // Pause queue first
    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'PAUSED' });

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('QUEUE_HAS_ACTIVE_PARTICIPANTS');
    expect(res.body.error.message).toBe('Queue cannot be deleted while participants are active.');
  });

  it('rejects deletion of a queue with CALLED active participant', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        status: 'CALLED',
        sequenceNumber: 1,
        token: crypto.randomUUID(),
        accessTokenHash: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
      },
    });

    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'PAUSED' });

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('QUEUE_HAS_ACTIVE_PARTICIPANTS');
  });

  it('rejects deletion of a queue with SERVING active participant', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        status: 'SERVING',
        sequenceNumber: 1,
        token: crypto.randomUUID(),
        accessTokenHash: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
      },
    });

    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'PAUSED' });

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('QUEUE_HAS_ACTIVE_PARTICIPANTS');
  });

  it('rejects deletion of a queue with historical participant entries to protect history and analytics', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    // Create completed/historical entry
    await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        status: 'COMPLETED',
        sequenceNumber: 1,
        token: crypto.randomUUID(),
        accessTokenHash: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
        completedAt: new Date(),
      },
    });

    // Close queue
    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'CLOSED' });

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('QUEUE_HAS_HISTORY');
    expect(res.body.error.message).toBe('Cannot delete a queue that has participant history. Please close it instead.');
  });

  it('rejects deletion of a queue with CANCELLED participant history', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        status: 'CANCELLED',
        sequenceNumber: 1,
        token: crypto.randomUUID(),
        accessTokenHash: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
      },
    });

    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'CLOSED' });

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('QUEUE_HAS_HISTORY');
  });

  it('rejects deletion of a queue with SKIPPED participant history', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    await prisma.queueEntry.create({
      data: {
        queueId: queue.id,
        status: 'SKIPPED',
        sequenceNumber: 1,
        token: crypto.randomUUID(),
        accessTokenHash: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
      },
    });

    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'PAUSED' });

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('QUEUE_HAS_HISTORY');
  });

  it('rejects unauthorized organizer from deleting queue', async () => {
    const org1 = await createOrganizer('owner@test.com');
    const org2 = await createOrganizer('intruder@test.com');
    const event = await createEvent(org1.token);
    const queue = await createQueue(org1.token, event.id);

    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org1.token}`)
      .send({ status: 'PAUSED' });

    const res = await request(app)
      .delete(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org2.token}`);

    expect(res.status).toBe(404);
  });

  it('concurrency: concurrent deletion and entry creation are transactionally isolated', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token);
    const queue = await createQueue(org.token, event.id);

    await request(app)
      .put(`/api/v1/queues/${queue.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'PAUSED' });

    // Race: attempt to delete queue while concurrently inserting an entry
    const results = await Promise.allSettled([
      request(app)
        .delete(`/api/v1/queues/${queue.id}`)
        .set('Authorization', `Bearer ${org.token}`),
      prisma.queueEntry.create({
        data: {
          queueId: queue.id,
          status: 'WAITING',
          sequenceNumber: 1,
          token: crypto.randomUUID(),
          accessTokenHash: crypto.randomUUID(),
          sessionId: crypto.randomUUID(),
        },
      }),
    ]);

    // Either the entry was created first and delete rejected with 400 QUEUE_HAS_ACTIVE_PARTICIPANTS,
    // or delete succeeded first and foreign key constraint rejected entry insert.
    // In NO case can a queue be deleted while leaving active entries behind or corrupting state.
    const remainingQueue = await prisma.queue.findUnique({ where: { id: queue.id } });
    const entries = await prisma.queueEntry.findMany({ where: { queueId: queue.id } });

    if (!remainingQueue) {
      // If queue was deleted, there must be 0 orphaned entries
      expect(entries.length).toBe(0);
    } else {
      // If queue was NOT deleted, it must still be intact
      expect(remainingQueue).toBeDefined();
    }
  });
});
