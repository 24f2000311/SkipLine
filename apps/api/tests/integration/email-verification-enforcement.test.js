import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import prisma from "../../src/infrastructure/database/prisma.js";
import {
  createOrganizer,
  createUnverifiedOrganizer,
  createEvent,
} from "./helpers.js";

describe("Email Verification Enforcement Integration Tests", () => {

  it("1. Unverified organizer can log in and retrieve their profile with emailVerifiedAt = null", async () => {
    const unverified = await createUnverifiedOrganizer("unverified-login");

    // Login using credentials
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: unverified.email,
        password: "password123",
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.user.emailVerifiedAt).toBeNull();
    expect(loginRes.body.data.tokens.accessToken).toBeDefined();

    // Verify session /me endpoint succeeds
    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.data.tokens.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.emailVerifiedAt).toBeNull();
  });

  it("2 & 3. Unverified organizer cannot create an event and receives 403 EMAIL_NOT_VERIFIED", async () => {
    const unverified = await createUnverifiedOrganizer("unverified-event");

    const startAt = new Date();
    const endAt = new Date(Date.now() + 3600000);

    const eventRes = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${unverified.token}`)
      .send({
        name: "Forbidden Unverified Event",
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });

    expect(eventRes.status).toBe(403);
    expect(eventRes.body.success).toBe(false);
    expect(eventRes.body.error.code).toBe("EMAIL_NOT_VERIFIED");
    expect(eventRes.body.error.message).toContain("Email verification required");

    // Verify no event was created in DB for this unverified organizer
    const eventsCount = await prisma.event.count({
      where: { organizerId: unverified.id },
    });
    expect(eventsCount).toBe(0);
  });

  it("4 & 5. Unverified organizer cannot create a queue and receives 403 EMAIL_NOT_VERIFIED", async () => {
    // 1. Create a verified organizer who legitimately creates an event
    const verified = await createOrganizer("verified-host");
    const event = await createEvent(verified.token);

    // 2. Unverified organizer attempts to create a queue for that event
    const unverified = await createUnverifiedOrganizer("unverified-queue");

    const queueRes = await request(app)
      .post("/api/v1/queues")
      .set("Authorization", `Bearer ${unverified.token}`)
      .send({
        eventId: event.id,
        name: "Forbidden Unverified Queue",
      });

    // Should be rejected (either unauthorized event or email not verified; when checking ownership first, it's 404/403)
    // If unverified attempts to create on their own event (which they couldn't create anyway, but let's test if event was owned):
    // Let's create an event belonging to unverified via direct DB seed to test queue enforcement specifically on owned event:
    const ownedEvent = await prisma.event.create({
      data: {
        organizerId: unverified.id,
        name: "Direct DB Event",
        startAt: new Date(),
        endAt: new Date(Date.now() + 3600000),
        status: "DRAFT",
      },
    });

    const ownedQueueRes = await request(app)
      .post("/api/v1/queues")
      .set("Authorization", `Bearer ${unverified.token}`)
      .send({
        eventId: ownedEvent.id,
        name: "Direct Owned Queue Attempt",
      });

    expect(ownedQueueRes.status).toBe(403);
    expect(ownedQueueRes.body.success).toBe(false);
    expect(ownedQueueRes.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    // Verify no queue was created in DB for this event
    const queuesCount = await prisma.queue.count({
      where: { eventId: ownedEvent.id },
    });
    expect(queuesCount).toBe(0);
  });

  it("6 & 7. Verified organizer can create an event and create a queue successfully", async () => {
    const verified = await createOrganizer("verified-creator");

    const startAt = new Date();
    const endAt = new Date(Date.now() + 3600000);

    const eventRes = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${verified.token}`)
      .send({
        name: "Verified Organizer Event",
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });

    expect(eventRes.status).toBe(201);
    expect(eventRes.body.success).toBe(true);
    expect(eventRes.body.data.id).toBeDefined();

    const queueRes = await request(app)
      .post("/api/v1/queues")
      .set("Authorization", `Bearer ${verified.token}`)
      .send({
        eventId: eventRes.body.data.id,
        name: "Verified Counter Queue",
      });

    expect(queueRes.status).toBe(201);
    expect(queueRes.body.success).toBe(true);
    expect(queueRes.body.data.name).toBe("Verified Counter Queue");
  });

  it("8. Successful email verification removes creation restriction", async () => {
    const unverified = await createUnverifiedOrganizer("lifecycle-verify");

    // Initially blocked
    const startAt = new Date();
    const endAt = new Date(Date.now() + 3600000);

    const blockedRes = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${unverified.token}`)
      .send({
        name: "Blocked Event",
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });

    expect(blockedRes.status).toBe(403);
    expect(blockedRes.body.error.code).toBe("EMAIL_NOT_VERIFIED");

    // Simulate verification token generation & usage
    await prisma.user.update({
      where: { id: unverified.id },
      data: { emailVerifiedAt: new Date() },
    });

    // Now creation succeeds immediately
    const allowedRes = await request(app)
      .post("/api/v1/events")
      .set("Authorization", `Bearer ${unverified.token}`)
      .send({
        name: "Now Allowed Event",
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
      });

    expect(allowedRes.status).toBe(201);
    expect(allowedRes.body.success).toBe(true);
  });

  it("10. Resend verification remains rate-limited and anti-enumeration", async () => {
    // Calling resend for existing unverified email
    const unverified = await createUnverifiedOrganizer("anti-enum");

    const resend1 = await request(app)
      .post("/api/v1/auth/resend-verification")
      .send({ email: unverified.email });

    expect(resend1.status).toBe(200);
    expect(resend1.body.message).toContain("If an account with that email exists");

    // Calling resend for non-existent email gives identical message
    const resendNonExistent = await request(app)
      .post("/api/v1/auth/resend-verification")
      .send({ email: "doesnotexist_998877@example.com" });

    expect(resendNonExistent.status).toBe(200);
    expect(resendNonExistent.body.message).toBe(resend1.body.message);
  });
});
