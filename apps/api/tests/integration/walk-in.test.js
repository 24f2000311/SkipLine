import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';

describe('Walk-in Participants', () => {
  it('Organizer can add a walk-in participant', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    const res = await request(app)
      .post(`/api/v1/queues/${queue.id}/walk-ins`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({
        customerName: 'John Walkin',
        customerPhone: '+15550001234',
        priority: 'VIP'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.entry).toBeDefined();
    expect(res.body.data.entry.status).toBe('WAITING');
    expect(res.body.data.entry.priority).toBe('VIP');
    expect(res.body.data.entry.customerName).toBe('John Walkin');
    expect(res.body.data.entry.customerPhone).toBe('+15550001234');
    expect(res.body.data.entry.sequenceNumber).toBeDefined();
    expect(res.body.data.entry.token).toBeDefined();
  });

  it('Cannot add walk-in with duplicate phone number', async () => {
    const org = await createOrganizer();
    const event = await createEvent(org.token, { status: 'LIVE' });
    const queue = await createQueue(org.token, event.id);

    await request(app)
      .post(`/api/v1/queues/${queue.id}/walk-ins`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ customerPhone: '+15550001111' });

    const duplicateRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/walk-ins`)
      .set('Authorization', `Bearer ${org.token}`)
      .send({ customerPhone: '+15550001111' });

    expect(duplicateRes.status).toBe(400);
    expect(duplicateRes.body.error.message).toMatch(/A customer with this phone number is already waiting/);
  });

  it('Unauthorized organizer cannot add walk-in', async () => {
    const org1 = await createOrganizer('org1@test.com');
    const org2 = await createOrganizer('org2@test.com');
    const event = await createEvent(org1.token, { status: 'LIVE' });
    const queue = await createQueue(org1.token, event.id);

    const res = await request(app)
      .post(`/api/v1/queues/${queue.id}/walk-ins`)
      .set('Authorization', `Bearer ${org2.token}`)
      .send({ customerName: 'Rogue Walkin' });

    expect(res.status).toBe(404);
  });
});
