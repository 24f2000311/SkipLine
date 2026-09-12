import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/infrastructure/database/prisma.js';
import { createOrganizer, createUnverifiedOrganizer, createEvent, createQueue } from './helpers.js';

describe('Account Deletion & Complete Owned-Data Cleanup Integration Tests', () => {
  it('Test 1: Authenticated organizer deletes account with valid password and account is purged', async () => {
    const password = 'CorrectPassword123!';
    const organizer = await createOrganizer('delete-acc-1', password);

    const res = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain('permanently deleted');

    // Confirm user row is completely gone from database
    const userInDb = await prisma.user.findUnique({
      where: { id: organizer.id },
    });
    expect(userInDb).toBeNull();
  });

  it('Test 2: Unauthenticated request is rejected with 401 Unauthorized', async () => {
    const res = await request(app)
      .delete('/api/v1/auth/account')
      .send({ password: 'any-password' });

    expect(res.status).toBe(401);
  });

  it('Test 3: Cannot target another user (userId in body/params is ignored; only req.user.id is deleted)', async () => {
    const password = 'TargetPassword123!';
    const userA = await createOrganizer('user-a-target', password);
    const userB = await createOrganizer('user-b-victim', password);

    // User A tries to pass User B's ID in body
    const res = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        password,
        userId: userB.id, // Malicious attempt to target User B
      });

    expect(res.status).toBe(200);

    // User A should be deleted
    const checkA = await prisma.user.findUnique({ where: { id: userA.id } });
    expect(checkA).toBeNull();

    // User B must remain completely intact!
    const checkB = await prisma.user.findUnique({ where: { id: userB.id } });
    expect(checkB).not.toBeNull();
    expect(checkB.id).toBe(userB.id);
  });

  it('Test 4 & 5: Owned events and queues are permanently deleted', async () => {
    const password = 'EventQueuePassword123!';
    const organizer = await createOrganizer('event-queue-del', password);

    const event1 = await createEvent(organizer.token, { name: 'Event 1' });
    const event2 = await createEvent(organizer.token, { name: 'Event 2' });

    const queue1 = await createQueue(organizer.token, event1.id, { name: 'Queue 1' });
    const queue2 = await createQueue(organizer.token, event1.id, { name: 'Queue 2' });
    const queue3 = await createQueue(organizer.token, event2.id, { name: 'Queue 3' });

    const res = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ password });

    expect(res.status).toBe(200);

    // Assert user deleted
    expect(await prisma.user.findUnique({ where: { id: organizer.id } })).toBeNull();

    // Assert all events deleted
    const eventsInDb = await prisma.event.findMany({
      where: { id: { in: [event1.id, event2.id] } },
    });
    expect(eventsInDb.length).toBe(0);

    // Assert all queues deleted
    const queuesInDb = await prisma.queue.findMany({
      where: { id: { in: [queue1.id, queue2.id, queue3.id] } },
    });
    expect(queuesInDb.length).toBe(0);
  });

  it('Test 6: All QueueEntries (active and historical) are permanently purged', async () => {
    const password = 'EntriesPassword123!';
    const organizer = await createOrganizer('entries-del', password);

    const event = await createEvent(organizer.token, { status: 'LIVE' });
    const queue = await createQueue(organizer.token, event.id, { name: 'Queue with entries' });

    // Join customers via public API
    const join1 = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-cust-1', customerName: 'Customer 1', customerPhone: '+1234567890' });
    expect(join1.status).toBe(201);

    const join2 = await request(app)
      .post(`/api/v1/queues/${queue.id}/entries`)
      .send({ sessionId: 'session-cust-2', customerName: 'Customer 2' });
    expect(join2.status).toBe(201);

    // Organizer calls Customer 1
    const callRes = await request(app)
      .post(`/api/v1/queues/${queue.id}/call-next`)
      .set('Authorization', `Bearer ${organizer.token}`);
    expect(callRes.status).toBe(200);
    const entryId = callRes.body.data.id;

    // Start serving Customer 1
    const startRes = await request(app)
      .post(`/api/v1/queue-entries/${entryId}/start`)
      .set('Authorization', `Bearer ${organizer.token}`);
    expect(startRes.status).toBe(200);

    // Complete Customer 1 to produce COMPLETED history
    const completeRes = await request(app)
      .post(`/api/v1/queue-entries/${entryId}/complete`)
      .set('Authorization', `Bearer ${organizer.token}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.status).toBe('COMPLETED');

    // Verify entries exist in DB before deletion
    const entriesBefore = await prisma.queueEntry.findMany({ where: { queueId: queue.id } });
    expect(entriesBefore.length).toBe(2);

    // Delete account
    const delRes = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ password });
    expect(delRes.status).toBe(200);

    // Verify all QueueEntries for the queue are deleted
    const entriesAfter = await prisma.queueEntry.findMany({ where: { queueId: queue.id } });
    expect(entriesAfter.length).toBe(0);
  });

  it('Test 7: Authentication records (RefreshTokens and AuthTokens) are purged', async () => {
    const password = 'TokensPassword123!';
    const organizer = await createOrganizer('tokens-del', password);

    // Create an authToken directly for user
    await prisma.authToken.create({
      data: {
        userId: organizer.id,
        type: 'EMAIL_VERIFICATION',
        tokenHash: 'dummy-token-hash-' + Date.now(),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const refreshTokensBefore = await prisma.refreshToken.findMany({ where: { userId: organizer.id } });
    const authTokensBefore = await prisma.authToken.findMany({ where: { userId: organizer.id } });
    expect(refreshTokensBefore.length).toBeGreaterThan(0);
    expect(authTokensBefore.length).toBeGreaterThan(0);

    // Delete account
    const res = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ password });
    expect(res.status).toBe(200);

    // Verify tokens deleted
    const refreshTokensAfter = await prisma.refreshToken.findMany({ where: { userId: organizer.id } });
    const authTokensAfter = await prisma.authToken.findMany({ where: { userId: organizer.id } });
    expect(refreshTokensAfter.length).toBe(0);
    expect(authTokensAfter.length).toBe(0);
  });

  it('Test 8: Other organizers and their owned data remain completely unaffected', async () => {
    const password = 'CommonPassword123!';
    const userA = await createOrganizer('org-a-clean', password);
    const userB = await createOrganizer('org-b-safe', password);

    const eventA = await createEvent(userA.token, { name: "User A's Event" });
    const queueA = await createQueue(userA.token, eventA.id, { name: "User A's Queue" });

    const eventB = await createEvent(userB.token, { name: "User B's Event" });
    const queueB = await createQueue(userB.token, eventB.id, { name: "User B's Queue" });

    // User A deletes account
    const res = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ password });
    expect(res.status).toBe(200);

    // User A and its data gone
    expect(await prisma.user.findUnique({ where: { id: userA.id } })).toBeNull();
    expect(await prisma.event.findUnique({ where: { id: eventA.id } })).toBeNull();
    expect(await prisma.queue.findUnique({ where: { id: queueA.id } })).toBeNull();

    // User B and its data are completely intact!
    const checkB = await prisma.user.findUnique({ where: { id: userB.id } });
    expect(checkB).not.toBeNull();
    expect(await prisma.event.findUnique({ where: { id: eventB.id } })).not.toBeNull();
    expect(await prisma.queue.findUnique({ where: { id: queueB.id } })).not.toBeNull();

    // User B can still access their profile and resources
    const profileRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userB.token}`);
    expect(profileRes.status).toBe(200);
    expect(profileRes.body.data.id).toBe(userB.id);
  });

  it('Test 9: Old customer queue URL returns 404 after organizer account deletion', async () => {
    const password = 'CustomerUrlPassword123!';
    const organizer = await createOrganizer('cust-url-del', password);
    const event = await createEvent(organizer.token, { status: 'LIVE' });
    const queue = await createQueue(organizer.token, event.id, { name: 'Customer Access Queue' });

    // Public queue fetch works initially
    const publicBefore = await request(app).get(`/api/v1/queues/${queue.id}/public`);
    expect(publicBefore.status).toBe(200);

    // Delete account
    await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ password });

    // Attempting to access deleted queue returns 404
    const publicAfter = await request(app).get(`/api/v1/queues/${queue.id}/public`);
    expect(publicAfter.status).toBe(404);
    expect(publicAfter.body.error.code).toBe('QUEUE_NOT_FOUND');
  });

  it('Test 10: Transaction failure completely rolls back deletion and leaves user intact', async () => {
    const password = 'RollbackPassword123!';
    const organizer = await createOrganizer('rollback-test', password);
    const event = await createEvent(organizer.token, { name: 'Rollback Event' });

    // Spy on prisma.$transaction to simulate an unexpected error during transaction execution
    const txSpy = vi.spyOn(prisma, '$transaction').mockRejectedValueOnce(new Error('Simulated Database Network Failure'));

    const res = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ password });

    expect(res.status).toBe(500);

    txSpy.mockRestore();

    // Verify user and event remain completely intact
    const userInDb = await prisma.user.findUnique({ where: { id: organizer.id } });
    expect(userInDb).not.toBeNull();

    const eventInDb = await prisma.event.findUnique({ where: { id: event.id } });
    expect(eventInDb).not.toBeNull();
  });

  it('Test 11: Rejects deletion with incorrect password and preserves account', async () => {
    const password = 'RealPassword123!';
    const organizer = await createOrganizer('wrong-pwd-test', password);

    const res = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${organizer.token}`)
      .send({ password: 'WrongPassword456!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');

    // Account remains intact
    const userInDb = await prisma.user.findUnique({ where: { id: organizer.id } });
    expect(userInDb).not.toBeNull();
  });

  it('Test 12: Unverified organizer can delete account without email verification restriction', async () => {
    const password = 'UnverifiedDelete123!';
    const unverifiedOrg = await createUnverifiedOrganizer('unverified-del', password);

    expect(unverifiedOrg.emailVerifiedAt).toBeNull();

    const res = await request(app)
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${unverifiedOrg.token}`)
      .send({ password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const userInDb = await prisma.user.findUnique({ where: { id: unverifiedOrg.id } });
    expect(userInDb).toBeNull();
  });
});
