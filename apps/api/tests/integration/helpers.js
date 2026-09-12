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

  // By default in integration test helper, mark organizer as verified so downstream tests proceed
  const verifiedUser = await prisma.user.update({
    where: { id: res.body.data.user.id },
    data: { emailVerifiedAt: new Date() },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    }
  });

  return {
    ...verifiedUser,
    token: res.body.data.tokens.accessToken
  };
};

export const createUnverifiedOrganizer = async (baseEmail = 'unverified', password = 'password123') => {
  const email = baseEmail.includes('@') ? baseEmail.replace('@', `-${crypto.randomUUID()}@`) : `${baseEmail}-${crypto.randomUUID()}@example.com`;
  
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Unverified Organizer', email, password });
  
  if (res.status >= 400) {
    throw new Error(`Failed to create unverified organizer: ${JSON.stringify(res.body)}`);
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

  const { status, ...createOverrides } = eventOverrides;

  const res = await request(app)
    .post('/api/v1/events')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Integration Test Event',
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      ...createOverrides
    });
    
  if (res.status >= 400) {
    throw new Error(`Failed to create event: ${JSON.stringify(res.body)}`);
  }

  let event = res.body.data;

  // Since createEvent always forces DRAFT, PUT to transition if a different status was requested
  if (status && status !== 'DRAFT') {
    const updateRes = await request(app)
      .put(`/api/v1/events/${event.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status });

    if (updateRes.status >= 400) {
      throw new Error(`Failed to update event status to ${status}: ${JSON.stringify(updateRes.body)}`);
    }
    event = updateRes.body.data;
  }

  return event;
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
