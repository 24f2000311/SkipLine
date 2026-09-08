import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import prisma from '../../src/infrastructure/database/prisma.js';

describe('Concurrency: Queue Capacity / Join', () => {
  it('concurrent joins must not exceed maxCapacity=1', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id, { maxCapacity: 1 });

    // Fire 5 concurrent join requests
    const joinPromises = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post(`/api/v1/queues/${queue.id}/entries`)
        .send({ sessionId: `cap-session-${i}` })
    );

    const results = await Promise.all(joinPromises);

    const successes = results.filter(r => r.status === 201);
    const rejections = results.filter(r => r.status >= 400);

    // INVARIANT: at most 1 should succeed
    const activeCount = await prisma.queueEntry.count({
      where: {
        queueId: queue.id,
        status: { in: ['WAITING', 'CALLED', 'SERVING'] },
      },
    });

    expect(activeCount).toBeLessThanOrEqual(1);
    expect(successes.length).toBeLessThanOrEqual(1);
    expect(rejections.length).toBeGreaterThanOrEqual(4);
  });

  it('concurrent joins must not exceed maxCapacity=3', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id, { maxCapacity: 3 });

    // Fire 10 concurrent join requests
    const joinPromises = Array.from({ length: 10 }, (_, i) =>
      request(app)
        .post(`/api/v1/queues/${queue.id}/entries`)
        .send({ sessionId: `cap3-session-${i}` })
    );

    const results = await Promise.all(joinPromises);
    const successes = results.filter(r => r.status === 201);

    const activeCount = await prisma.queueEntry.count({
      where: {
        queueId: queue.id,
        status: { in: ['WAITING', 'CALLED', 'SERVING'] },
      },
    });

    expect(activeCount).toBeLessThanOrEqual(3);
    expect(successes.length).toBeLessThanOrEqual(3);
  });

  it('concurrent joins must produce unique sequence numbers', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const joinPromises = Array.from({ length: 5 }, (_, i) =>
      request(app)
        .post(`/api/v1/queues/${queue.id}/entries`)
        .send({ sessionId: `seq-session-${i}` })
    );

    await Promise.all(joinPromises);

    const entries = await prisma.queueEntry.findMany({
      where: { queueId: queue.id },
      select: { sequenceNumber: true },
    });

    const seqNumbers = entries.map(e => Number(e.sequenceNumber));
    const uniqueSeqs = new Set(seqNumbers);

    // INVARIANT: all sequence numbers must be unique
    expect(uniqueSeqs.size).toBe(entries.length);
  });
});
