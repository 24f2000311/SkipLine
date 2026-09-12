import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent } from './helpers.js';

describe('Event Start Boundary & Timezone-Safe Verification', () => {
  it('rejects transitioning to LIVE immediately before scheduled startAt time', async () => {
    const org = await createOrganizer();
    
    // Scheduled in the future (1 hour ahead)
    const futureStartAt = new Date(Date.now() + 60 * 60 * 1000);
    const futureEndAt = new Date(Date.now() + 3 * 60 * 60 * 1000);

    const event = await createEvent(org.token, {
      startAt: futureStartAt.toISOString(),
      endAt: futureEndAt.toISOString(),
    });

    const res = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'LIVE' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EVENT_CANNOT_START_EARLY');
    expect(res.body.error.message).toBe('Event cannot start before its scheduled start time.');
  });

  it('allows transitioning to LIVE exactly at scheduled startAt time', async () => {
    const org = await createOrganizer();
    const fixedNow = 1750000000000;
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedNow);

    try {
      const event = await createEvent(org.token, {
        startAt: new Date(fixedNow).toISOString(),
        endAt: new Date(fixedNow + 2 * 60 * 60 * 1000).toISOString(),
      });

      const res = await request(app)
        .put(`/api/v1/events/${event.id}`)
        .set('Authorization', `Bearer ${org.token}`)
        .send({ status: 'LIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('LIVE');
    } finally {
      dateSpy.mockRestore();
    }
  });

  it('allows transitioning to LIVE when startAt timestamp has arrived', async () => {
    const org = await createOrganizer();

    // Start time set to past
    const nowStartAt = new Date(Date.now() - 500);
    const endAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const event = await createEvent(org.token, {
      startAt: nowStartAt.toISOString(),
      endAt: endAt.toISOString(),
    });

    const res = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'LIVE' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('LIVE');
  });

  it('allows transitioning to LIVE after scheduled startAt time has passed', async () => {
    const org = await createOrganizer();

    // Start time 10 minutes in the past
    const pastStart = new Date(Date.now() - 10 * 60 * 1000);
    const futureEnd = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const event = await createEvent(org.token, {
      startAt: pastStart.toISOString(),
      endAt: futureEnd.toISOString(),
    });

    const res = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ status: 'LIVE' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('LIVE');
  });

  it('rejects unauthorized organizer from starting event', async () => {
    const org1 = await createOrganizer('owner@test.com');
    const org2 = await createOrganizer('intruder@test.com');

    const event = await createEvent(org1.token);

    const res = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${org2.token}`)
      .send({ status: 'LIVE' });

    expect(res.status).toBe(404);
  });
});
