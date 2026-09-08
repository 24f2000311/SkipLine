import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/infrastructure/database/prisma.js';
import crypto from 'crypto';

export const createOrganizer = async (baseEmail = 'test', password = 'password123') => {
  const email = baseEmail.includes('@') ? baseEmail.replace('@', `-${crypto.randomUUID()}@`) : `${baseEmail}-${crypto.randomUUID()}@example.com`;
  
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Test Organizer', email, password });
  
  if (res.status >= 400) {
    throw new Error(`Failed to create organizer: ${JSON.stringify(res.body)}`);
  }

  return {
    ...res.body.data.user,
    token: res.body.data.tokens.accessToken
  };
};

export const createEvent = async (token, eventOverrides = {}) => {
  const startAt = new Date();
  const endAt = new Date();
  endAt.setHours(endAt.getHours() + 2);

  const res = await request(app)
    .post('/api/v1/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Integration Test Event',
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      ...eventOverrides
    });
    
  if (res.status >= 400) {
    throw new Error(`Failed to create event: ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
};

export const createQueue = async (token, eventId, queueOverrides = {}) => {
  const res = await request(app)
    .post('/api/v1/queues')
    .set('Authorization', `Bearer ${token}`)
    .send({
      eventId,
      name: 'Test Queue',
      ...queueOverrides
    });
    
  if (res.status >= 400) {
    throw new Error(`Failed to create queue: ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
};
