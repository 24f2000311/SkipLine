import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import prisma from '../../src/infrastructure/database/prisma.js';

describe('Concurrency: callNext', () => {
  it('concurrent callNext with 1 WAITING entry must call exactly 1 entry', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    // Create 1 waiting entry
    await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'cn-single-1' });

    // Fire 5 concurrent callNext requests
    const callPromises = Array.from({ length: 5 }, () =>
      request(app)
        .post(`/api/v1/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${org.token}`)
    );

    const results = await Promise.all(callPromises);

    const calledResults = results.filter(r => r.status === 200 && r.body.data !== null);
    const nullResults = results.filter(r => r.status === 200 && r.body.data === null);

    // INVARIANT: exactly 1 should succeed with an entry, rest should get null
    expect(calledResults.length).toBe(1);
    expect(nullResults.length).toBe(4);

    // Verify database state
    const calledEntries = await prisma.queueEntry.findMany({
      where: { queueId: queue.id, status: 'CALLED' },
    });
    expect(calledEntries.length).toBe(1);

    // Verify totalCallsCount incremented exactly once
    const queueAfter = await prisma.queue.findUnique({ where: { id: queue.id } });
    expect(queueAfter.totalCallsCount).toBe(1);
  });

  it('concurrent callNext with 3 WAITING entries must call exactly 3 distinct entries', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    // Create 3 waiting entries
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`/api/v1/queues/${queue.id}/entries`)
        .send({ sessionId: `cn-multi-${i}` });
    }

    // Fire 6 concurrent callNext requests
    const callPromises = Array.from({ length: 6 }, () =>
      request(app)
        .post(`/api/v1/queues/${queue.id}/call-next`)
        .set('Authorization', `Bearer ${org.token}`)
    );

    const results = await Promise.all(callPromises);

    const calledResults = results.filter(r => r.status === 200 && r.body.data !== null);
    const nullResults = results.filter(r => r.status === 200 && r.body.data === null);

    // INVARIANT: exactly 3 entries should be called, 3 should get null
    expect(calledResults.length).toBe(3);
    expect(nullResults.length).toBe(3);

    // Verify all called entries are distinct
    const calledIds = calledResults.map(r => r.body.data.id);
    const uniqueIds = new Set(calledIds);
    expect(uniqueIds.size).toBe(3);

    // Verify database state
    const calledEntries = await prisma.queueEntry.findMany({
      where: { queueId: queue.id, status: 'CALLED' },
    });
    expect(calledEntries.length).toBe(3);

    const queueAfter = await prisma.queue.findUnique({ where: { id: queue.id } });
    expect(queueAfter.totalCallsCount).toBe(3);
  });
});
