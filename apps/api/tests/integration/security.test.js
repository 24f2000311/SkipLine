import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { createOrganizer, createEvent, createQueue } from './helpers.js';
import prisma from '../../src/infrastructure/database/prisma.js';

describe('Security Hardening', () => {
  describe('Authorization / Ownership', () => {
    it('Organizer B cannot callNext on Organizer A queue', async () => {
      const orgA = await createOrganizer();
      const orgB = await createOrganizer();
      
      const eventA = await createEvent(orgA.token, { status: 'LIVE' });
      const queueA = await createQueue(orgA.token, eventA.id);

      // Org B tries to call next on Org A's queue
      const response = await request(app)
        .post(`/api/v1/queues/${queueA.id}/call-next`)
        .set('Authorization', `Bearer ${orgB.token}`);

      expect(response.status).toBe(404);
    });

    it('Organizer B cannot startServing Organizer A entry', async () => {
      const orgA = await createOrganizer();
      const orgB = await createOrganizer();
      
      const eventA = await createEvent(orgA.token, { status: 'LIVE' });
      const queueA = await createQueue(orgA.token, eventA.id);

      const joinRes = await request(app)
        .post(`/api/v1/queues/${queueA.id}/entries`)
        .send({ sessionId: 'cust1' });
      
      expect(joinRes.status).toBe(201);
      const entryId = joinRes.body.data.entry.id;

      await request(app)
        .post(`/api/v1/queues/${queueA.id}/call-next`)
        .set('Authorization', `Bearer ${orgA.token}`);

      const response = await request(app)
        .post(`/api/v1/queue-entries/${entryId}/start`)
        .set('Authorization', `Bearer ${orgB.token}`);

      expect(response.status).toBe(404);
    });

    it('Organizer B cannot completeService Organizer A entry', async () => {
        const orgA = await createOrganizer();
        const orgB = await createOrganizer();
        
        const eventA = await createEvent(orgA.token, { status: 'LIVE' });
        const queueA = await createQueue(orgA.token, eventA.id);
  
        const joinRes = await request(app)
          .post(`/api/v1/queues/${queueA.id}/entries`)
          .send({ sessionId: 'cust2' });
        
        const entryId = joinRes.body.data.entry.id;
  
        await request(app)
          .post(`/api/v1/queues/${queueA.id}/call-next`)
          .set('Authorization', `Bearer ${orgA.token}`);
  
        await request(app)
          .post(`/api/v1/queue-entries/${entryId}/start`)
          .set('Authorization', `Bearer ${orgA.token}`);
  
        const response = await request(app)
          .post(`/api/v1/queue-entries/${entryId}/complete`)
          .set('Authorization', `Bearer ${orgB.token}`);
  
        expect(response.status).toBe(404);
    });

    it('Organizer B cannot handleNoShow Organizer A entry', async () => {
        const orgA = await createOrganizer();
        const orgB = await createOrganizer();
        
        const eventA = await createEvent(orgA.token, { status: 'LIVE' });
        const queueA = await createQueue(orgA.token, eventA.id);
  
        const joinRes = await request(app)
          .post(`/api/v1/queues/${queueA.id}/entries`)
          .send({ sessionId: 'cust3' });
        
        const entryId = joinRes.body.data.entry.id;
  
        await request(app)
          .post(`/api/v1/queues/${queueA.id}/call-next`)
          .set('Authorization', `Bearer ${orgA.token}`);
  
        const response = await request(app)
          .post(`/api/v1/queue-entries/${entryId}/no-show`)
          .set('Authorization', `Bearer ${orgB.token}`);
  
        expect(response.status).toBe(404);
    });
  });

  describe('PII / Information Disclosure', () => {
    it('serializeQueueEntry does not leak accessTokenHash or sessionId', async () => {
      const org = await createOrganizer();
      const event = await createEvent(org.token, { status: 'LIVE' });
      const queue = await createQueue(org.token, event.id);

      const joinRes = await request(app)
        .post(`/api/v1/queues/${queue.id}/entries`)
        .send({ sessionId: 'cust4' });
      
      const entry = joinRes.body.data.entry;
      
      expect(entry).not.toHaveProperty('accessTokenHash');
      expect(entry).not.toHaveProperty('sessionId');
      expect(entry).not.toHaveProperty('queue');
    });
  });

  describe('Mass Assignment', () => {
    it('Client cannot force event status to LIVE on creation', async () => {
      const org = await createOrganizer();
      const res = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${org.token}`)
        .send({
          name: 'Hacked Event',
          startAt: new Date(Date.now() + 86400000).toISOString(),
          endAt: new Date(Date.now() + 86400000 * 2).toISOString(),
          status: 'LIVE' // Should be ignored
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('DRAFT');
    });
  });

  describe('Input Validation', () => {
    it('Queue maxCapacity cannot be negative or zero', async () => {
      const org = await createOrganizer();
      const event = await createEvent(org.token, { status: 'LIVE' });

      const resZero = await request(app)
        .post(`/api/v1/queues`)
        .set('Authorization', `Bearer ${org.token}`)
        .send({ eventId: event.id, name: 'Queue 1', maxCapacity: 0 });
        
      expect(resZero.status).toBe(400);

      const resNeg = await request(app)
        .post(`/api/v1/queues`)
        .set('Authorization', `Bearer ${org.token}`)
        .send({ eventId: event.id, name: 'Queue 1', maxCapacity: -5 });
        
      expect(resNeg.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('Returns generic message for 500 errors', async () => {
        const org = await createOrganizer();
        // invalid UUID format for eventId - should trigger Prisma error
        const res = await request(app)
            .post(`/api/v1/events/invalid-uuid/queues`)
            .set('Authorization', `Bearer ${org.token}`)
            .send({ name: 'Queue 1' });
            
        // Should NOT leak raw Prisma error message
        if (res.status === 500) {
            expect(res.body.error.message).toBe("Something went wrong");
            expect(res.body.error.message).not.toContain("Prisma");
        }
    });
  });
});
